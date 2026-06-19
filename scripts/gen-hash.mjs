import bcrypt from 'bcryptjs'
const pw = process.env.PW
if (!pw) { console.error('Ustaw PW=...'); process.exit(1) }
const hash = await bcrypt.hash(pw, 12)
console.log(hash)
