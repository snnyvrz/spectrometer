import "./globals.css";
import { Dashboard } from "../components/dashboard";
import { getTimestamps } from "@/api/fetch";
import { connection } from "next/server";

export default async function Home() {
  await connection();
  const timestamps = getTimestamps();
  {
    /* no await is used here because the component will suspend until the promise resolves */
  }

  return (
    <main className="flex flex-col items-center container mx-auto p-8 gap-4">
      <Dashboard timestamps={timestamps} />
    </main>
  );
}
