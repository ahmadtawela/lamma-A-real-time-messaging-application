export default function Page({ title, actions, children, narrow }) {
  return (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto p-4 md:p-6 ${narrow ? 'max-w-2xl' : 'max-w-5xl'}`}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2"><h1 className="text-xl font-bold">{title}</h1><div className="flex gap-2">{actions}</div></div>
        {children}
      </div>
    </div>
  );
}
