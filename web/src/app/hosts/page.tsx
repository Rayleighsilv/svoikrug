import Link from 'next/link'
import Header from '@/components/Header'

export const metadata = {
  title: 'Хостам — SvoiKrug',
}

export default function HostsPage() {
  return (
    <main className="min-h-screen bg-gray-50 text-gray-900">
      <Header />
      <div className="mx-auto max-w-3xl px-6 py-8">
        <Link href="/" className="text-sm font-medium text-blue-600 hover:underline">
          ← На главную
        </Link>

        <h1 className="mt-4 text-2xl font-bold">Всё для хостов</h1>
        <p className="mt-2 text-gray-600">
          Соберите камерную встречу, найдите своих людей и позаботьтесь о гостях.
        </p>

        <div className="mt-6 space-y-4">
          <section
            id="passport"
            className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <h2 className="text-lg font-semibold">🪪 Паспорт хоста</h2>
            <p className="mt-2 text-sm text-gray-600">
              Публичный профиль с ником, городом, рейтингом и отзывами гостей.
              Чем больше встреч вы проводите, тем выше доверие участников.
            </p>
            <Link
              href="/profile"
              className="mt-3 inline-block text-sm font-medium text-blue-600 hover:underline"
            >
              Открыть профиль
            </Link>
          </section>

          <section
            id="safety"
            className="scroll-mt-6 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100"
          >
            <h2 className="text-lg font-semibold">🛡 Безопасность и правила</h2>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-gray-600">
              <li>Публичный адрес виден всем, точный — только подтверждённым гостям.</li>
              <li>Заявки на участие подтверждает хост: так проще собрать своих.</li>
              <li>После встречи гости могут оценить организатора — рейтинг формируют реальные отзывы.</li>
              <li>Уважайте границы и договорённости, о которых вы написали в описании.</li>
            </ul>
          </section>

          <div className="rounded-2xl bg-white p-6 text-center shadow-sm ring-1 ring-gray-100">
            <p className="text-gray-600">Готовы собрать свою встречу?</p>
            <Link
              href="/events/new"
              className="mt-3 inline-block rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-blue-700"
            >
              Стать хостом
            </Link>
          </div>
        </div>
      </div>
    </main>
  )
}
