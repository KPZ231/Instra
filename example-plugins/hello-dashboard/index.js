/**
 * hello-dashboard  przykładowy plugin dla Instra
 *
 * Co robi:
 *  - Rejestruje widget w slocie DASHBOARD_TOP
 *  - Zlicza wizyty użytkownika w KV storage
 *  - Zwraca UIBlock[] które BlockRenderer wyświetli na dashboardzie
 *
 * Jak uruchomić (dev):
 *  1. Uploaduj ten plik + manifest.json przez /dashboard/plugins/upload
 *  2. Admin zatwierdza plugin w /dashboard/admin/plugins
 *  3. Zainstaluj plugin z /dashboard/plugins
 *  4. Wejdź na /dashboard  widget pojawi się automatycznie
 */

/** @param {import('@/types/plugin').PluginContext} context */
export async function init(context) {
  context.logger.info('hello-dashboard: inicjalizacja')

  // Zarejestruj widget w slocie DASHBOARD_TOP
  // Slot odpowiada uprawnieniu "widgets:dashboard:top" z manifestu
  context.registerWidget('DASHBOARD_TOP', async () => {
    // Pobierz licznik wizyt z KV storage (null jeśli pierwszy raz)
    const raw = await context.api.storage.get('visit_count')
    const count = typeof raw === 'number' ? raw : 0

    // Zwiększ i zapisz licznik
    await context.api.storage.set('visit_count', count + 1)

    // Zwróć UIBlock[]  BlockRenderer wyrenderuje je na dashboardzie
    return [
      {
        type: 'card',
        title: '👋 Hello Dashboard Plugin',
        children: [
          {
            type: 'text',
            value: 'Cześć! Ten widget pochodzi z systemu pluginów Instra.',
          },
          {
            type: 'list',
            items: [
              `Wizyty na dashboardzie: ${count + 1}`,
              'Plugin używa: widgets:dashboard:top, storage:kv',
              'Wersja: 1.0.0',
            ],
          },
          {
            type: 'button',
            label: 'Resetuj licznik',
            action: 'reset_count',
          },
        ],
      },
    ]
  })

  context.logger.info('hello-dashboard: widget zarejestrowany w DASHBOARD_TOP')
}

/**
 * Opcjonalna funkcja czyszcząca  wywoływana przy odinstalowaniu pluginu.
 * Tutaj można anulować subskrypcje, timery itp.
 */
export async function destroy() {
  // nic do sprzątania w tym pluginie
}
