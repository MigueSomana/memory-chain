import React from "react";
import ModalLogIn from "./ModalLogIn";
import ModalSignOut from "./ModalSignOut";
import ModalUpgradePlan from "./ModalUpgradePlan";

const Modal = () => {
  return (
    <>
      <ModalLogIn />
      <ModalSignOut />
      <ModalUpgradePlan />
    </>
  );
};

export default Modal;