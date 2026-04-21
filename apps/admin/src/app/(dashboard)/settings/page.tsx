export default function SettingsPage() {
  return (
    <div className="max-w-2xl space-y-8">
      <h1 className="text-2xl font-extrabold text-gray-900">Configurações da plataforma</h1>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-bold text-gray-900 text-base">Comissões</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão padrão (%)</label>
            <input defaultValue="10" type="number" min="0" max="100" className="w-40 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Aplicada após os primeiros 90 dias do treinador</p>
          </div>
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">Comissão early-bird (%)</label>
            <input defaultValue="5" type="number" min="0" max="100" className="w-40 px-4 py-2 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
            <p className="text-xs text-gray-400 mt-1">Primeiros 90 dias de cada novo treinador</p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-bold text-gray-900 text-base">Políticas de reembolso</h2>
        <div className="space-y-4">
          <SettingRow label="Reembolso total (horas antes)" default="12" />
          <SettingRow label="Reembolso parcial (horas antes)" default="2" />
          <SettingRow label="Percentagem reembolso parcial (%)" default="50" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-bold text-gray-900 text-base">Check-in</h2>
        <div className="space-y-4">
          <SettingRow label="Raio máximo (metros)" default="200" />
          <SettingRow label="Janela antes da sessão (min)" default="15" />
          <SettingRow label="Janela depois do início (min)" default="30" />
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 p-6 space-y-5">
        <h2 className="font-bold text-gray-900 text-base">Planos e preços</h2>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">User Plus</span>
            <span className="font-bold text-gray-900">€4,99 / único (365 dias)</span>
          </div>
          <div className="flex justify-between py-2 border-b border-gray-100">
            <span className="text-gray-600">Trainer</span>
            <span className="font-bold text-gray-900">€19 / mês</span>
          </div>
          <div className="flex justify-between py-2">
            <span className="text-gray-600">Coach Pro</span>
            <span className="font-bold text-gray-900">€39 / mês</span>
          </div>
        </div>
        <p className="text-xs text-gray-400">Para alterar preços, atualiza os Stripe Price IDs no .env</p>
      </div>

      <div className="flex justify-end">
        <button className="bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition-colors">
          Guardar configurações
        </button>
      </div>
    </div>
  );
}

function SettingRow({ label, default: defaultVal }: { label: string; default: string }) {
  return (
    <div className="flex items-center justify-between">
      <label className="text-sm font-semibold text-gray-700">{label}</label>
      <input
        defaultValue={defaultVal}
        type="number"
        className="w-32 px-3 py-2 border border-gray-200 rounded-xl text-sm text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
}
