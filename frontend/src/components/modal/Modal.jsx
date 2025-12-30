import React from 'react'
import ModalSignUp from './ModalSignUp'
import ModalLogIn from './ModalLogIn'
import ModalSignOut from './ModalSignOut'

// Clase Modal que engloba todos los modales de autenticación
const Modal = () => {
  return (
    <>
    <ModalLogIn />
    <ModalSignUp />
    <ModalSignOut />
    </>
  )
}

export default Modal