import React from 'react'
import ModalLogIn from './ModalLogIn'
import ModalSignOut from './ModalSignOut'

// Clase Modal que engloba todos los modales de autenticación
const Modal = () => {
  return (
    <>
    <ModalLogIn />
    <ModalSignOut />
    </>
  )
}

export default Modal