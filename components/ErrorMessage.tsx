import React from 'react';

const ErrorMessage: React.FC<{ message: string }> = ({ message }) => (
  <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 rounded-md shadow-md max-w-2xl mx-auto" role="alert">
    <p className="font-bold">An Error Occurred</p>
    <p>{message}</p>
  </div>
);

export default ErrorMessage;
