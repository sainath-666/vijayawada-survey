const express = require("express");
const fs = require("fs");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// Allow static files (if you want to serve the HTML from Node)
app.use(express.static(path.join(__dirname)));

// CSV file path
const filePath = path.join(__dirname, "responses.csv");

// Create CSV with comprehensive headers if it doesn't exist
if (!fs.existsSync(filePath)) {
  const maxMembers = 10;
  const maxTrips = 10;
  const maxTransfers = 5;
  const likertCount = 72; // Total number of Likert items

  const headers = [
    // General
    "SampleID",
    "Date",
    "Name",
    "Contact",
    "Email",
    "Address",
    "Ward",
    "GPS_Lat",
    "GPS_Lon",
    "GPS_Acc",
    // Demographic
    "HH_Size",
    "HH_Income",
  ];

  // Members - Individual columns for each member
  for (let i = 1; i <= maxMembers; i++) {
    headers.push(
      `Member${i}_Gender`,
      `Member${i}_Age`,
      `Member${i}_License`,
      `Member${i}_Education`,
      `Member${i}_Occupation`,
      `Member${i}_Income`,
      `Member${i}_TransportExpenditure`
    );
  }

  // Vehicles
  headers.push(
    "Vehicle_Car",
    "Vehicle_TwoWheeler",
    "Vehicle_Auto",
    "Vehicle_Cycle",
    "Vehicle_Truck"
  );

  // Trips - Individual columns for each trip
  for (let i = 1; i <= maxTrips; i++) {
    headers.push(
      `Trip${i}_Purpose`,
      `Trip${i}_Start`,
      `Trip${i}_End`,
      `Trip${i}_Frequency`,
      `Trip${i}_Mode`,
      `Trip${i}_Distance`,
      `Trip${i}_Time`,
      `Trip${i}_Cost`,
      `Trip${i}_TransferCount`
    );
    // Transfer details for each trip
    for (let j = 1; j <= maxTransfers; j++) {
      headers.push(`Trip${i}_Transfer${j}_From`, `Trip${i}_Transfer${j}_To`);
    }
  }

  // Experience (7 questions)
  headers.push(
    "Exp_Q1_OverallRating",
    "Exp_Q2_Frequency",
    "Exp_Q3_SafetyIncidents",
    "Exp_Q4_UnsafeTimes",
    "Exp_Q5_AccessQuality",
    "Exp_Q6_AccessFactors",
    "Exp_Q7_FootpathCondition"
  );

  // Likert - Individual columns for each statement
  for (let i = 1; i <= likertCount; i++) {
    headers.push(`Likert${i}_Response`);
  }

  // Feedback
  headers.push("Feedback", "SubmittedAt");

  const header = headers.join(",") + "\n";
  fs.writeFileSync(filePath, header, "utf8");
}

function csvSafe(value) {
  if (value === undefined || value === null) return "";
  const s = String(value).replace(/"/g, '""');
  return `"${s}"`;
}

app.post("/submit", (req, res) => {
  const p = req.body || {};
  const g = p.General || {};
  const gps = g.GPS || {};
  const exp = p.Experience || {};

  const maxMembers = 10;
  const maxTrips = 10;
  const maxTransfers = 5;
  const likertCount = 72;

  // Extract vehicle counts
  const vehicles = p.Vehicles || [];
  const getVehicleCount = (name) => {
    const v = vehicles.find((v) => v.Vehicle && v.Vehicle.includes(name));
    return v ? v.Count : 0;
  };

  const row = [
    // General
    csvSafe(g.SampleID),
    csvSafe(g.Date),
    csvSafe(g.Name),
    csvSafe(g.Contact),
    csvSafe(g.Email),
    csvSafe(g.Address),
    csvSafe(g.Ward),
    csvSafe(gps.lat),
    csvSafe(gps.lon),
    csvSafe(gps.acc),
    // Demographic
    csvSafe(p.Demographic?.HHSize || ""),
    csvSafe(p.Demographic?.HHIncome || ""),
  ];

  // Members - Expand each member into separate columns
  const members = p.Members || [];
  for (let i = 0; i < maxMembers; i++) {
    const member = members[i] || {};
    row.push(
      csvSafe(member.Gender || ""),
      csvSafe(member.Age || ""),
      csvSafe(member.License || ""),
      csvSafe(member.Education || ""),
      csvSafe(member.Occupation || ""),
      csvSafe(member.Income || ""),
      csvSafe(member.TransportExp || "")
    );
  }

  // Vehicles
  row.push(
    csvSafe(getVehicleCount("Car")),
    csvSafe(getVehicleCount("Two Wheeler")),
    csvSafe(getVehicleCount("Auto")),
    csvSafe(getVehicleCount("Cycle")),
    csvSafe(getVehicleCount("Truck"))
  );

  // Trips - Expand each trip into separate columns
  const trips = p.Trips || [];
  for (let i = 0; i < maxTrips; i++) {
    const trip = trips[i] || {};
    row.push(
      csvSafe(trip.Purpose || ""),
      csvSafe(trip.Start || ""),
      csvSafe(trip.End || ""),
      csvSafe(trip.Frequency || ""),
      csvSafe(trip.Mode || ""),
      csvSafe(trip.Distance || ""),
      csvSafe(trip.Time || ""),
      csvSafe(trip.Cost || ""),
      csvSafe(trip.TransferCount || "")
    );

    // Transfers for this trip
    const transfers = trip.Transfers || [];
    for (let j = 0; j < maxTransfers; j++) {
      const transfer = transfers[j] || {};
      row.push(csvSafe(transfer.From || ""), csvSafe(transfer.To || ""));
    }
  }

  // Experience
  row.push(
    csvSafe(exp.Q1),
    csvSafe(exp.Q2),
    csvSafe(exp.Q3),
    csvSafe(exp.Q4),
    csvSafe(exp.Q5),
    csvSafe(exp.Q6),
    csvSafe(exp.Q7)
  );

  // Likert - Expand each response into separate columns
  const likert = p.Likert || [];
  for (let i = 0; i < likertCount; i++) {
    const item = likert[i] || {};
    row.push(csvSafe(item.Response || ""));
  }

  // Feedback
  row.push(
    csvSafe(p.Feedback),
    csvSafe(p.SubmittedAt || new Date().toISOString())
  );

  fs.appendFile(filePath, row.join(",") + "\n", (err) => {
    if (err) {
      console.error("Error writing to CSV:", err);
      return res.status(500).send("Error saving data");
    }
    res.status(200).send("Saved");
  });
});

// Optional: download endpoint
app.get("/download", (req, res) => {
  res.download(filePath, "responses.csv");
});

app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
