import React from "react";
import NotFoundImg from "../../assets/notfound.png"

const NotFound = () => {
  return (
    <div className="text-white">
      <img src={NotFoundImg} width={700} />
      <h1>En proceso NotFound</h1>
    </div>
  );
};

export default NotFound;