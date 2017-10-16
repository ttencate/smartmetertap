const bodyParser = require('body-parser')
const check = require('express-validator/check')

const authTokens = require('../services/authTokens')
const log = require('../core/log')
const telegrams = require('../services/telegrams')
const telegramParser = require('../services/telegramParser')

const AUTH_TOKEN_HEADER = 'x-auth-token'

async function createFromBody (req, res) {
  const errors = check.validationResult(req)
  if (!errors.isEmpty()) {
    log.warn(errors.array())
    res.sendStatus(400)
    return
  }

  const token = req.headers[AUTH_TOKEN_HEADER] || ''
  const data = req.body.toString('ascii') // TODO see what happens if we shove it to the database as a Buffer directly

  const user = await authTokens.getOwnerUser({ token })
  if (!user) {
    log.warn(`Auth token ${token} is invalid`)
    res.sendStatus(403)
    return
  }

  const telegram = await telegrams.create({ ownerUserId: user.id, telegram: data })
  log.info(`Stored ${data.length} byte telegram for user ${user.id}`)

  if (telegramParser.isCrcValid(data)) {
    let parsed
    try {
      parsed = telegramParser.parse(data)
    } catch (ex) {
      log.warn(`Error parsing telegram: ${ex}`)
      throw ex
    }
  }

  res.sendStatus(200)
}

module.exports = {
  create: [
    bodyParser.raw({ type: 'text/plain' }), // Populates req.body as a Buffer.
    createFromBody
  ],
  createFromBody
}
