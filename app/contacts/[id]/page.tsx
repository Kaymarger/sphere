"use client";

import { useParams } from "next/navigation";
import { ContactProfile } from "@/components/contact-profile";

export default function ContactPage() {
  const params = useParams<{ id: string }>();
  return <ContactProfile id={params.id} />;
}
