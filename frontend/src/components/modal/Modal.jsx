import React from 'react'
import ModalSignUp from './ModalSignUp'
import ModalLogIn from './ModalLogIn'
import ModalSignOut from './ModalSignOut'

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