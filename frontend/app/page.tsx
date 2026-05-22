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
      <div className="w-full max-w-4xl p-2 border border-primary rounded-lg">
        <p className="text-lg text-gray-600 text-left">
          First you need to connect to the server, then you can control the
          simulator and view the data in real-time.
        </p>
      </div>
      <Dashboard timestamps={timestamps} />
    </main>
  );
}
