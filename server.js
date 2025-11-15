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
  const header =
    [
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
      // Members (will store as JSON array for simplicity)
      "Members_JSON",
      // Vehicles
      "Vehicle_Car",
      "Vehicle_TwoWheeler",
      "Vehicle_Auto",
      "Vehicle_Cycle",
      "Vehicle_Truck",
      // Trips (will store as JSON array)
      "Trips_JSON",
      // Experience (7 questions)
      "Exp_Q1_OverallRating",
      "Exp_Q2_Frequency",
      "Exp_Q3_SafetyIncidents",
      "Exp_Q4_UnsafeTimes",
      "Exp_Q5_AccessQuality",
      "Exp_Q6_AccessFactors",
      "Exp_Q7_FootpathCondition",
      // Likert (store as JSON array for all responses)
      "Likert_JSON",
      // Feedback
      "Feedback",
      // Metadata
      "SubmittedAt",
    ].join(",") + "\n";
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

  // Extract vehicle counts
  const vehicles = p.Vehicles || [];
  const getVehicleCount = (name) => {
    const v = vehicles.find((v) => v.Vehicle && v.Vehicle.includes(name));
    return v ? v.Count : 0;
  };

  const row =
    [
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
      // Members
      csvSafe(JSON.stringify(p.Members || [])),
      // Vehicles
      csvSafe(getVehicleCount("Car")),
      csvSafe(getVehicleCount("Two Wheeler")),
      csvSafe(getVehicleCount("Auto")),
      csvSafe(getVehicleCount("Cycle")),
      csvSafe(getVehicleCount("Truck")),
      // Trips
      csvSafe(JSON.stringify(p.Trips || [])),
      // Experience
      csvSafe(exp.Q1),
      csvSafe(exp.Q2),
      csvSafe(exp.Q3),
      csvSafe(exp.Q4),
      csvSafe(exp.Q5),
      csvSafe(exp.Q6),
      csvSafe(exp.Q7),
      // Likert
      csvSafe(JSON.stringify(p.Likert || [])),
      // Feedback
      csvSafe(p.Feedback),
      // Metadata
      csvSafe(p.SubmittedAt || new Date().toISOString()),
    ].join(",") + "\n";

  fs.appendFile(filePath, row, (err) => {
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
