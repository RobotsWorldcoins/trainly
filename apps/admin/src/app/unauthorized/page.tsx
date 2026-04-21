import Link from 'next/link';

export default function UnauthorizedPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="text-center">
        <div className="text-8xl mb-6">🔒</div>
        <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Acesso negado</h1>
        <p className="text-gray-500 mb-8">Não tens permissão para aceder a esta página.</p>
        <Link
          href="/login"
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors"
        >
          Voltar ao login
        </Link>
      </div>
    </div>
  );
}
