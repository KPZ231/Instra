/**
 * Tworzy lub ustawia rolę ADMIN dla admin@instra.site
 * Uruchom: node scripts/seed-admin.mjs
 */
import { PrismaClient, UserRole } from '@prisma/client'
import { createHash } from 'crypto'

const prisma = new PrismaClient()

// Argon2/bcrypt nie jest dostępny w czystym node — używamy bcryptjs
let bcrypt
try {
  bcrypt = (await import('bcryptjs')).default
} catch {
  console.error('Brak bcryptjs: npm install bcryptjs')
  process.exit(1)
}
  
const EMAIL = process.env.ADMIN_SEED_EMAIL
const PASSWORD = process.env.ADMIN_SEED_PASSWORD
if (!EMAIL || !PASSWORD) {
  console.error('Ustaw ADMIN_SEED_EMAIL i ADMIN_SEED_PASSWORD przed uruchomieniem skryptu')
  process.exit(1)
}

async function main() {
  const existing = await prisma.user.findUnique({
    where: { email: EMAIL },
    select: { id: true, email: true, role: true },
  })

  if (existing) {
    console.log(`Użytkownik istnieje: ${existing.email} | rola: ${existing.role}`)
    if (existing.role !== UserRole.ADMIN) {
      await prisma.user.update({
        where: { email: EMAIL },
        data: { role: UserRole.ADMIN },
      })
      console.log(`✅ Rola zaktualizowana na ADMIN`)
    } else {
      console.log(`✅ Już jest ADMIN — brak zmian`)
    }
  } else {
    const passwordHash = await bcrypt.hash(PASSWORD, 12)
    const user = await prisma.user.create({
      data: {
        email: EMAIL,
        name: 'Admin',
        role: UserRole.ADMIN,
        passwordHash,
      },
    })
    console.log(`✅ Utworzono administratora: ${user.email} (id: ${user.id})`)
  }
}

main()
  .catch((e) => { console.error('Błąd:', e.message); process.exit(1) })
  .finally(() => prisma.$disconnect())
