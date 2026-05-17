module.exports = async (req, res) => {
  const { username } = req.query
  if (!username) {
    return res.status(400).json({ error: 'Username required' })
  }

  try {
    res.json({
      success: true,
      profile: {
        username,
        full_name: username,
        followers: 0,
        following: 0,
        posts: 0,
        is_private: false,
        profile_pic: null
      }
    })
  } catch (err) {
    res.status(500).json({ error: 'Could not fetch profile' })
  }
}

