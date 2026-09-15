// app/message/[user_id]/page.tsx
"use client";

import { useParams } from "next/navigation";

export default function MessagePage() {
  const params = useParams();
  const user_id = params.user_id as string;

  return <div>Message for User {user_id}</div>;
}
