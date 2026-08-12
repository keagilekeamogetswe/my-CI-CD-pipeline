import argon2 from "argon2"

import { CredentialsRepository } from "../credentials/repository"
import { ProfileRepository } from "../profile/repository"

import Verification from "../verification/control"
import { Database } from "../db"
import { SessionRepository } from "../session/repository"
import { JWTHelper } from "../../utility/jwt"
import { DeamonClient } from "../../grpc-clients/deamon"
import { randomUUID } from "crypto"

export const AccountCreation = (() => {

    return {

        /*
         * Starts the account creation process.
         *
         * The supplied account and device information is placed inside
         * a verification payload. Verification.request() is responsible
         * for generating and sending the phone verification code.
         */
        async request(name, lastname, dob, phone, auto_detected) {

            const { code, body, dial_code_id } = phone

            const payload = {
                name,
                lastname,
                dob,
                phone,
                ...auto_detected
            }

            const verification_token =
                await Verification.request(payload, "phone")

            return verification_token
        },

        /*
         * Completes account creation after the phone verification succeeds.
         *
         * The flow is:
         *
         * 1. Verify the submitted verification code.
         * 2. Create the user's authentication record.
         * 3. Associate the verified phone number with the user.
         * 4. Create the user's profile.
         * 5. Create a refresh-token session.
         * 6. Persist the hashed refresh token in the database.
         * 7. Return the raw refresh token to the caller.
         */
        async confirm(
            verification_token,
            token,
            mysql_connection
        ) {

            // Reuse the supplied connection when called inside an existing
            // transaction; otherwise create a new database connection.
            mysql_connection =
                mysql_connection ?? await Database.getSQLConnection()

            // Validate the verification token and retrieve the original
            // account/device payload that was stored during request().
            const payload = await Verification.confirm(
                verification_token,
                token
            )

            /*
             * The verification payload contains the dial-code information
             * required during verification. The actual dial code itself
             * does not need to be persisted with the phone record because
             * dial_code_id provides the database relationship.
             */
            delete payload.phone.code

            // Create the base authentication/credentials record first so
            // that the generated user_id can be used by related records.
            const user_id = await CredentialsRepository.create(
                null,
                mysql_connection
            )

            /*
             * Store the verified phone number and associate it with the
             * newly-created user.
             */
            const phone_id = await CredentialsRepository.linkPhone(
                user_id,
                payload.phone,
                mysql_connection
            )

            // Add the generated database identifiers to the profile payload.
            payload.phone_id = phone_id
            payload.user_id = user_id

            // Create the user's profile using the verified account data.
            const profile_id = await ProfileRepository.create(
                payload,
                mysql_connection
            )

            /*
             * Only copy information that belongs in a login session.
             *
             * The original verification payload may contain profile,
             * phone, and verification-specific fields that should never
             * become part of the refresh-token/session data.
             */
            const session_payload = {}

            Object.keys(payload).forEach((key) => {

                const required = [
                    "ip_address",
                    "device_info",
                    "fp_hash",
                    "user_id"
                ]

                if (required.includes(key)) {
                    session_payload[key] = payload[key]
                }
            })

            /*
             * Generate a unique identifier for this refresh-token session.
             *
             * This JTI is shared between the JWT and the database session,
             * allowing the refresh token to be individually revoked or
             * looked up later.
             */
            const jti = randomUUID()
            session_payload.jti = jti

            /*
             * Keep JavaScript Date objects for database persistence.
             *
             * JWTHelper.encode() is responsible for converting the expiration
             * into the NumericDate representation required by the JWT.
             */
            const now = new Date()
            const iat = now

            // Refresh tokens remain valid for 30 days.
            const exp = new Date(
                now.getTime() +
                30 * 24 * 60 * 60 * 1000
            )

            /*
             * Create the refresh token using the session information.
             *
             * The token contains the session identity (jti), user identity,
             * and device information needed when the refresh token is later
             * presented.
             */
            const refresh_token = await JWTHelper.encode(
                session_payload,
                exp,
                process.env.JWT_AUTH_REFRESH_TOKEN_SECRET
            )

            /*
             * Never store the raw refresh token in the database.
             *
             * If the database is compromised, storing the raw token would
             * allow an attacker to use existing sessions. Argon2 produces
             * a one-way hash that can later be verified against the token.
             */
            const token_hash = await argon2.hash(refresh_token)

            /*
             * Add database-specific session fields.
             *
             * session_payload now contains both the JWT/session claims and
             * the fields required by the user_session table.
             */
            session_payload.created_at = iat
            session_payload.expires_at = exp
            session_payload.token_hash = token_hash

            /*
             * Persist the refresh-token session before returning the token.
             *
             * Awaiting this operation ensures the session exists in the
             * database before the caller receives a usable refresh token.
             */
            await SessionRepository.save(
                session_payload,
                mysql_connection
            )

            return refresh_token
        }
    }
})()
