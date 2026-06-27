# hello-dashboard

Przykładowy plugin dla systemu pluginów Instra. Wyświetla widget na dashboardzie i zlicza wizyty użytkownika.

## Co robi

- Rejestruje widget w slocie `DASHBOARD_TOP`
- Zlicza wizyty na dashboardzie (każdego użytkownika osobno, przez `storage:kv`)
- Zwraca `UIBlock[]` z kartą powitalną, listą statystyk i przyciskiem

## Uprawnienia (z manifestu)

| Uprawnienie | Po co |
|---|---|
| `widgets:dashboard:top` | Rejestracja widgetu w górnej sekcji dashboardu |
| `storage:kv` | Zapis/odczyt licznika wizyt per użytkownik |

## Jak uruchomić

1. **Upload**  wejdź na `/dashboard/plugins/upload` i prześlij `index.js` oraz wklej zawartość `manifest.json`
2. **Review**  admin zatwierdza plugin w `/dashboard/admin/plugins`
3. **Instalacja**  znajdź plugin w `/dashboard/plugins` i kliknij "Zainstaluj"
4. **Efekt**  wejdź na `/dashboard`  widget pojawi się automatycznie w górnej sekcji

## Struktura UIBlock

Plugin zwraca następującą strukturę:

```
card: "Hello Dashboard Plugin"
  ├── text: opis pluginu
  ├── list: statystyki (liczba wizyt, uprawnienia, wersja)
  └── button: "Resetuj licznik" (action: "reset_count")
```

> **Uwaga:** Przycisk z `action: "reset_count"` jest przykładowy  obsługa akcji przycisków po stronie frontendu nie jest jeszcze zaimplementowana w `BlockRenderer`. To dobry punkt startowy do rozszerzenia systemu.

## Rozszerzanie pluginu

Możesz dodać kolejne sloty lub zdarzenia:

```js
// Dodatkowy slot (wymaga uprawnienia w manifeście)
context.registerWidget('DASHBOARD_SIDEBAR', async () => [
  { type: 'text', value: 'Sidebar widget' }
])

// Nasłuchiwanie zdarzeń
context.on('user:login', (payload) => {
  context.logger.info(`Użytkownik zalogowany: ${JSON.stringify(payload)}`)
})
```
