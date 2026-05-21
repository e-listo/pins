"use client";
import { useState, useEffect } from "react";
import UserManagement from "../../src/components/UserManagement";
export default function UserPage() {
  const [daftarBidangUPT, setDaftarBidangUPT] = useState([]);
  return <UserManagement />;
}
