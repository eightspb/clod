export function ClayBlobTitle({ children }) {
  return (
    <div className="flex justify-center mb-10">
      <div className="clay-title-blob relative px-14 py-10 md:px-24 md:py-14 flex flex-col items-center">
        <h2 className="clay-title-3d text-3xl sm:text-4xl md:text-5xl font-extrabold text-center whitespace-nowrap">
          {children}
        </h2>
        <div className="flex gap-2 mt-3">
          <div className="w-2 h-2 rounded-full bg-white/50" />
          <div className="w-2.5 h-2.5 rounded-full bg-white/65" />
          <div className="w-2 h-2 rounded-full bg-white/50" />
        </div>
      </div>
    </div>
  )
}

export default ClayBlobTitle
