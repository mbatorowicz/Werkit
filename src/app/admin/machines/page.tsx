export default function MachinesPage() {
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto w-full">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-2xl font-semibold text-white tracking-tight">Flota i sprzęt ciężki</h1>
          <p className="text-zinc-500 mt-1">Lista sprzętów własnych, wywrotek i maszyn warsztatowych.</p>
        </div>
        <button className="bg-white text-zinc-950 px-4 py-2 text-sm font-medium rounded-lg hover:bg-zinc-200 transition shadow-sm">
          Zarejestruj nową maszynę
        </button>
      </div>
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl flex flex-col h-64 items-center justify-center shadow-sm">
         <p className="text-zinc-500 text-sm font-medium">Moduł floty w trakcie implementacji.</p>
      </div>
    </div>
  )
}
