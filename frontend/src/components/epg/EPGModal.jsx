export default function EPGModal({ program, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
      <div className="bg-neutral-900 p-6 rounded-xl w-[400px] shadow-xl">
        <h2 className="text-xl font-bold mb-2">{program.title?.[0]}</h2>
        <p className="text-gray-300 mb-4">{program.desc?.[0]}</p>

        <button
          onClick={onClose}
          className="mt-4 px-4 py-2 bg-blue-600 hover:bg-blue-500 rounded-lg"
        >
          Close
        </button>
      </div>
    </div>
  );
}
