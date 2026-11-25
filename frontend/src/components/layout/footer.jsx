'use client'

export function Footer() {
  return (
    <footer className="mt-auto py-6 border-t border-gray-200">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <p className="text-sm text-gray-500">
          © {new Date().getFullYear()} VOXO ChatBot SaaS. Tous droits réservés.
        </p>
        <div className="flex items-center space-x-6 text-sm text-gray-500">
          <a href="#" className="hover:text-blue-600 transition-colors">Documentation</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Support</a>
          <a href="#" className="hover:text-blue-600 transition-colors">Confidentialité</a>
        </div>
      </div>
    </footer>
  )
}
