const Drive = require("../models/Drive");

function serializeDrive(d) {
  return {
    id: d._id,
    spot: d.spot,
    title: d.title,
    date: d.date,
    timeLabel: d.timeLabel,
    interestedCount: d.interestedCount,
    beforePhotoUrl: d.beforePhotoUrl,
    afterPhotoUrl: d.afterPhotoUrl,
  };
}

// GET /api/drives
async function listDrives(req, res) {
  const drives = await Drive.find().populate("spot", "name").sort({ date: 1 });
  res.json(
    drives.map((d) => ({
      ...serializeDrive(d),
      spotName: d.spot ? d.spot.name : null,
    }))
  );
}

// POST /api/drives  (admin or community organizer)
async function createDrive(req, res) {
  const { spotId, title, date, timeLabel } = req.body;
  if (!spotId || !title || !date) {
    return res.status(400).json({ error: "spotId, title, and date are required." });
  }
  const drive = await Drive.create({ spot: spotId, title, date, timeLabel });
  res.status(201).json(serializeDrive(drive));
}

// POST /api/drives/:id/join   body: { contact? }
async function joinDrive(req, res) {
  const drive = await Drive.findById(req.params.id);
  if (!drive) return res.status(404).json({ error: "Drive not found." });

  drive.interestedCount += 1;
  if (req.body.contact) drive.joinedContacts.push(req.body.contact);
  await drive.save();

  res.json(serializeDrive(drive));
}

module.exports = { listDrives, createDrive, joinDrive };
