import { db } from "./server/db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";

async function testSync() {
  const DEMO_USER_ID = "demo-user";
  const userList = await db.select().from(users).where(eq(users.id, DEMO_USER_ID));
  const user = userList[0];

  if (!user || !user.googleFitAccessToken) {
    console.error("No access token found");
    return;
  }

  const endMillis = Date.now();
  const oneYearMillis = 365 * 24 * 60 * 60 * 1000;
  
  // Test just ONE chunk to see if it works or fails
  const chunk = {
    start: endMillis - oneYearMillis,
    end: endMillis
  };

  console.log("Fetching aggregate data for 1 year chunk:", chunk);
  
  const res = await fetch("https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${user.googleFitAccessToken}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      aggregateBy: [{
        dataTypeName: "com.google.step_count.delta",
        dataSourceId: "derived:com.google.step_count.delta:com.google.android.gms:estimated_steps"
      }],
      bucketByTime: { durationMillis: 86400000 },
      startTimeMillis: chunk.start,
      endTimeMillis: chunk.end
    })
  });

  const text = await res.text();
  console.log(`Status: ${res.status}`);
  console.log(`Response: ${text.substring(0, 1000)}`);
}

testSync().catch(console.error);
