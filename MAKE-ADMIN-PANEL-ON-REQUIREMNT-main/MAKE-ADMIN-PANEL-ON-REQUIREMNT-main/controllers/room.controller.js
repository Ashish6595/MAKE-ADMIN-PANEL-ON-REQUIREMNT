const Room = require('../models/Room.model');
const Device = require('../models/Device.model');

// POST /api/rooms - create a new room (e.g. Living Room, Bedroom)
const createRoom = async (req, res) => {
  try {
    const { name, description } = req.body;

    if (!name) {
      return res.status(400).json({ message: 'Room name is required' });
    }

    const newRoom = new Room({
      name: name.trim(),
      description: description || '',
      householdId: req.user.householdId
    });

    await newRoom.save();

    res.status(201).json({
      message: 'Room created successfully',
      room: newRoom
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error creating room', error: error.message });
  }
};

// GET /api/rooms - get all rooms in household
const getRooms = async (req, res) => {
  try {
    const rooms = await Room.find({ householdId: req.user.householdId }).sort({ createdAt: 1 });
    res.status(200).json({
      count: rooms.length,
      rooms
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error fetching rooms', error: error.message });
  }
};

// DELETE /api/rooms/:id - delete a room and unassign/delete its devices
const deleteRoom = async (req, res) => {
  try {
    const { id } = req.params;

    const room = await Room.findOne({ _id: id, householdId: req.user.householdId });
    if (!room) {
      return res.status(404).json({ message: 'Room not found' });
    }

    // delete devices inside this room
    await Device.deleteMany({ roomId: id });
    await Room.findByIdAndDelete(id);

    res.status(200).json({
      message: 'Room and its associated devices deleted successfully'
    });
  } catch (error) {
    res.status(500).json({ message: 'Server error deleting room', error: error.message });
  }
};

module.exports = {
  createRoom,
  getRooms,
  deleteRoom
};
