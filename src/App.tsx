import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import LexEstateLogin from '@/pages/lexestate/LexEstateLogin'
import LexEstateApp from '@/pages/lexestate/LexEstateApp'

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/lexestate/login" element={<LexEstateLogin />} />
        <Route path="/lexestate/app"   element={<LexEstateApp />} />
        <Route path="*" element={<Navigate to="/lexestate/login" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
