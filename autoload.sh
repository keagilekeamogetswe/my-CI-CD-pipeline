#!/usr/bin/env bash
# Use the bash shell to run this script.
set -euo pipefail
# Stop the script if any command fails, if a variable is not set, or if a pipeline fails.
shopt -s nullglob
# Make wildcard matching return no results instead of the pattern text when nothing matches.

# ---------------------------------------------------
# Logging
# ---------------------------------------------------

LOG_DIR="logs/build-deployment"
# Set the folder where log files will be stored.
mkdir -p "$LOG_DIR"
# Create the log folder if it does not already exist.

LOG_FILE="${LOG_DIR}/autoload_$(date +'%Y-%m-%d_%H-%M-%S').log"
# Create a unique log file name using the current date and time.

exec > >(tee -a "$LOG_FILE") 2>&1
# Send all output to the terminal and save it to the log file.

echo "=================================================="
# Print a divider line for the log output.
echo " Autoload Session Started: $(date)"
# Show the date and time when the script started.
echo " Logging to: ${LOG_FILE}"
# Show the location of the log file being used.
echo "=================================================="
# Print the ending divider line.
echo
# Add a blank line to make the log easier to read.

# ---------------------------------------------------
# Locate helper scripts
# ---------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Find the full path of the folder where this script is located.

BUILD_SHELL="${SCRIPT_DIR}/build.sh"
# Set the path to the build helper script.
DEPLOY_SHELL="${SCRIPT_DIR}/deploy.sh"
# Set the path to the deploy helper script.

chmod +x "$BUILD_SHELL" "$DEPLOY_SHELL" 2>/dev/null || true
# Make the helper scripts executable if they exist.

if [[ ! -f "$BUILD_SHELL" || ! -f "$DEPLOY_SHELL" ]]; then
    # Check whether the build and deploy scripts are present.
    echo "ERROR: build.sh or deploy.sh missing."
    # Show an error if either helper script is missing.
    exit 1
    # Stop the script because it cannot continue without those scripts.
fi

# ---------------------------------------------------
# Search patterns
# ---------------------------------------------------
# NOTE: The pattern list is intentionally limited at the moment.
# This script currently only looks for Skaffold configs under
# microservices/*.skaffold.yaml. Other candidate paths are
# commented out because they are not used in this repo yet.
# If you need to support additional locations, uncomment and
# update the patterns below.
PATTERNS=(
    "kubernetes/skaffold.yaml"
    "k8s-bundle/*/skaffold.yaml"
    "microservices/*.skaffold.yaml"

)
# Define the file patterns to search for.

TARGET_FILES=()
# Create an empty list to store any matching Skaffold files.

for pattern in "${PATTERNS[@]}"; do
    # Loop through each search pattern.
    for file in $pattern; do
        # Check each file that matches the current pattern.
        TARGET_FILES+=("$file")
        # Add the matching file to the list.
    done
    # Finish the inner loop after checking one pattern.
done
# Finish the outer loop after checking all patterns.

if [[ ${#TARGET_FILES[@]} -eq 0 ]]; then
    # Check whether any matching Skaffold files were found.
    echo "No Skaffold configurations found."
    # Tell the user that no config files were found.
    exit 0
    # End the script successfully because there is nothing to process.
fi

echo "Found ${#TARGET_FILES[@]} Skaffold configuration(s)."
# Show how many Skaffold files were found.

printf '  %s\n' "${TARGET_FILES[@]}"
# Print each found Skaffold file name.

# ---------------------------------------------------
# Build
# ---------------------------------------------------

echo
# Add a blank line before the build section.
echo "=== Phase 1: Build ==="
# Start the build phase section.

for file in "${TARGET_FILES[@]}"; do
    # Loop through each found Skaffold file.

    DIR="$(dirname "$file")"
    # Get the folder that contains the current file.
    NAME="$(basename "$file")"
    # Get the file name from the full path.

    echo
    # Add a blank line before showing the file name.
    echo "--> ${NAME}"
    # Print the name of the file being processed.

    (
        cd "$DIR"
        # Change into the folder of the current file.
        "$BUILD_SHELL" "$NAME"
        # Run the build helper script for this file.
    )
    # Finish the build step for this file.
done
# Finish the build loop after all files are processed.

# ---------------------------------------------------
# Deploy
# ---------------------------------------------------

echo
# Add a blank line before the deploy section.
echo "=== Phase 2: Deploy ==="
# Start the deploy phase section.

for file in "${TARGET_FILES[@]}"; do
    # Loop through each found Skaffold file again.

    DIR="$(dirname "$file")"
    # Get the folder that contains the current file.
    NAME="$(basename "$file")"
    # Get the file name from the full path.

    echo
    # Add a blank line before showing the file name.
    echo "--> ${NAME}"
    # Print the name of the file being processed.

    (
        cd "$DIR"
        # Change into the folder of the current file.
        "$DEPLOY_SHELL" "$NAME"
        # Run the deploy helper script for this file.
    )
    # Finish the deploy step for this file.
done
# Finish the deploy loop after all files are processed.

echo
# Add a blank line before the final message.
echo "Autoload completed successfully."
# Tell the user that the script finished successfully.
echo "Log saved to: ${LOG_FILE}"
# Show the location of the log file created by the script.