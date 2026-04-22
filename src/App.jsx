import { NavLink, Route, Routes } from 'react-router-dom';
import Busca from './pages/Busca';
import Dashboard from './pages/Dashboard';
import Historico from './pages/Historico';
import ImportarBase from './pages/ImportarBase';
import NovoEncaixe from './pages/NovoEncaixe';

const navigation = [
  { label: 'Dashboard', to: '/' },
  { label: 'Novo Encaixe', to: '/novo-encaixe' },
  { label: 'Busca', to: '/busca' },
  { label: 'Histórico', to: '/historico' },
  { label: 'Importar Base', to: '/importar-base' }
];

function App() {
  return (
    <div className="min-h-screen bg-surface bg-hero-grid text-slate-900">
      <div className="flex min-h-screen">
        <aside className="hidden w-72 flex-col bg-slate-950 px-6 py-8 text-slate-200 lg:flex">
          <div>
            <p className="text-xs uppercase tracking-[0.35em] text-slate-400">Crown</p>
            <h1 className="mt-3 text-2xl font-semibold text-white">ENCAIXES PRO</h1>
            <p className="mt-3 text-sm leading-6 text-slate-400">
              Operação rápida de encaixe com base Excel, validação instantânea e resultado exportável.
            </p>
          </div>

          <nav className="mt-10 space-y-2">
            {navigation.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) =>
                  `flex items-center rounded-2xl px-4 py-3 text-sm font-medium transition ${
                    isActive
                      ? 'bg-brand-500 text-white shadow-soft'
                      : 'text-slate-300 hover:bg-slate-900 hover:text-white'
                  }`
                }
              >
                {item.label}
              </NavLink>
            ))}
          </nav>

          <div className="mt-auto rounded-3xl border border-slate-800 bg-slate-900/70 p-5">
            <p className="text-sm font-semibold text-white">Operação assistida</p>
            <p className="mt-2 text-sm text-slate-400">
              Menos cliques, busca instantânea e visual pronto para uso em rotina real.
            </p>
          </div>
        </aside>

        <main className="flex-1 px-4 py-4 sm:px-6 lg:px-10 lg:py-8">
          <div className="mx-auto max-w-7xl">
            <header className="mb-6 rounded-[28px] border border-white/60 bg-white/80 px-6 py-5 shadow-soft backdrop-blur">
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div>
                  <p className="text-sm font-medium text-brand-600">Sistema operacional SaaS</p>
                  <h2 className="text-2xl font-semibold text-ink">CROWN ENCAIXES PRO</h2>
                </div>
                <div className="flex flex-wrap gap-2 lg:hidden">
                  {navigation.map((item) => (
                    <NavLink
                      key={item.to}
                      to={item.to}
                      className={({ isActive }) =>
                        `rounded-full px-4 py-2 text-sm font-medium ${
                          isActive ? 'bg-brand-500 text-white' : 'bg-slate-100 text-slate-700'
                        }`
                      }
                    >
                      {item.label}
                    </NavLink>
                  ))}
                </div>
              </div>
            </header>

            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/novo-encaixe" element={<NovoEncaixe />} />
              <Route path="/busca" element={<Busca />} />
              <Route path="/historico" element={<Historico />} />
              <Route path="/importar-base" element={<ImportarBase />} />
            </Routes>
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
