import React from 'react';
import { Process, Task } from '../types';

interface ProcessCardProps {
  process: Process;
  onCompleteTask: (processId: string, taskIndex: number) => void;
  onCloseProcess: (processId: string) => void;
  onReopenProcess: (process: Process) => void;
}

const CalendarIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
    </svg>
);

const UserIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd" />
    </svg>
);

const CommentIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
      <path fillRule="evenodd" d="M18 5v8a2 2 0 01-2 2h-5l-5 4v-4H4a2 2 0 01-2-2V5a2 2 0 012-2h12a2 2 0 012 2zM7 8H5v2h2V8zm2 0h2v2H9V8zm6 0h-2v2h2V8z" clipRule="evenodd" />
    </svg>
);


const ProcessCard: React.FC<ProcessCardProps> = ({ process, onCompleteTask, onCloseProcess, onReopenProcess }) => {
  const currentTask: Task | undefined = process.tasks[process.currentTaskIndex];
  const isLastTask = process.currentTaskIndex === process.tasks.length - 1;

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border-l-4 border-blue-500 transition-shadow duration-300 hover:shadow-xl">
      <div className="flex justify-between items-start mb-4">
        <h3 className="text-xl font-bold text-gray-800">{process.name}</h3>
        <span className={`px-3 py-1 text-sm font-semibold rounded-full ${
          process.status === 'Abierto' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}>
          {process.status}
        </span>
      </div>

      {process.status === 'Abierto' && currentTask ? (
        <div>
          <p className="text-md font-semibold text-blue-700 mb-3">Próxima Tarea: {currentTask.name}</p>
          <div className="space-y-3 text-gray-600">
            <div className="flex items-center">
              <UserIcon />
              <span><strong>Responsable:</strong> {currentTask.assignee}</span>
            </div>
            <div className="flex items-center">
              <CalendarIcon />
              <span><strong>Fecha de Seguimiento:</strong> {formatDate(currentTask.followUpDate)}</span>
            </div>
            {currentTask.comments && (
                <div className="flex items-start pt-2">
                    <CommentIcon />
                    <div className="flex-1">
                        <strong className="block">Comentarios:</strong>
                        <p className="text-sm bg-gray-50 p-2 rounded border border-gray-200 mt-1">{currentTask.comments}</p>
                    </div>
                </div>
            )}
          </div>
          <div className="mt-6 text-right">
            <button
              onClick={() => onCompleteTask(process.id, process.currentTaskIndex)}
              className="px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200"
            >
              {isLastTask ? 'Completar y Cerrar Proceso' : 'Completar Tarea'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <p className="text-gray-600 mb-4">{process.status === 'Cerrado' ? 'Este proceso ha sido completado.' : 'No hay tareas definidas para este proceso.'}</p>
           {process.status === 'Cerrado' && (
            <div className="mt-6 text-right">
                <button
                    onClick={() => onReopenProcess(process)}
                    className="px-4 py-2 bg-yellow-500 text-white font-semibold rounded-lg shadow-md hover:bg-yellow-600 focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:ring-opacity-75 transition-colors duration-200"
                >
                    Reabrir Proceso
                </button>
            </div>
           )}
        </div>
      )}
       <div className="text-xs text-gray-400 mt-4 pt-2 border-t">
        Creado: {formatDate(process.createdAt)} | Última Actualización: {formatDate(process.updatedAt)}
      </div>
    </div>
  );
};

export default ProcessCard;
