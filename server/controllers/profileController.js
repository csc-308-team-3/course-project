const {
  getProfileByUserId,
  updateProfile: updateProfileByUserId,
} = require('../services/profileService');

function isValidEmail(email) {
  return /^\S+@\S+\.\S+$/.test(email);
}

async function getProfile(request, response) {
  const userId = request.session?.userId;

  if (!userId) {
    return response.status(401).json({
      message: 'You must be logged in to view a profile.',
    });
  }

  try {
    const profile = await getProfileByUserId(userId);

    if (!profile) {
      return response.status(401).json({
        message: 'Your session is no longer valid.',
      });
    }

    return response.status(200).json({ profile });
  } catch (error) {
    console.error('Profile lookup failed.', { code: error.code });
    return response.status(500).json({
      message: 'Unable to load the profile.',
    });
  }
}

async function updateProfile(request, response) {
  const userId = request.session?.userId;

  if (!userId) {
    return response.status(401).json({
      message: 'You must be logged in to edit a profile.',
    });
  }

  const { name, email } = request.body ?? {};
  const updates = {};

  if (name !== undefined) {
    if (
      typeof name !== 'string' ||
      name.trim().length < 1 ||
      name.trim().length > 100
    ) {
      return response.status(400).json({
        message: 'Name must be between 1 and 100 characters.',
      });
    }

    updates.name = name.trim();
  }

  if (email !== undefined) {
    if (typeof email !== 'string' || !isValidEmail(email.trim())) {
      return response.status(400).json({
        message: 'Enter a valid email address.',
      });
    }

    updates.email = email.trim().toLowerCase();
  }

  if (Object.keys(updates).length === 0) {
    return response.status(400).json({
      message: 'Provide a name or email to update.',
    });
  }

  try {
    const profile = await updateProfileByUserId(userId, updates);

    if (!profile) {
      return response.status(401).json({
        message: 'Your session is no longer valid.',
      });
    }

    return response.status(200).json({ profile });
  } catch (error) {
    if (error.code === '23505') {
      return response.status(409).json({
        message: 'An account with that email already exists.',
      });
    }

    console.error('Profile update failed.', { code: error.code });
    return response.status(500).json({
      message: 'Unable to update the profile.',
    });
  }
}

module.exports = {
  getProfile,
  updateProfile,
};