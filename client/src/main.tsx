import React from 'react'
import ReactDOM from 'react-dom/client'
import { ToastContainer } from 'react-toastify'
import { App } from './App'
import { StoreProvider } from './store/root.store'
import './index.css'
import { GoogleOAuthProvider } from '@react-oauth/google'





ReactDOM.createRoot(document.getElementById('root')!).render(

  <>
    <React.StrictMode>
      <GoogleOAuthProvider clientId={'1026970301384-bi5knnci1e5ngs3ga2au87squ9p3f2mv.apps.googleusercontent.com'}>
        <StoreProvider>
          <App />
        </StoreProvider>
      </GoogleOAuthProvider>
    </React.StrictMode>

    <ToastContainer
      position="top-right"
      autoClose={1500}
      className="flex flex-col gap-1 my-2 min-w-[200px]"
      toastClassName={(props) =>
        (props?.defaultClassName ?? "") +
        " bg-[#232323] mb-0 w-full rounded-xl h-auto !p-2  text-white flex items-center gap-0.5 text-base !font-bold select-none min-h-12"
      }
      hideProgressBar={true}
      closeButton={false}
      draggable
      draggableDirection="x"
    />


  </>
)