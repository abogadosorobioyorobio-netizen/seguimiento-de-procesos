import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Process, Task } from './types';
import ProcessCard from './components/ProcessCard';

const initialTask: Omit<Task, 'id' | 'isComplete'> = {
  name: '',
  assignee: '',
  followUpDate: new Date().toISOString().split('T')[0],
  comments: ''
};

// Main App Component
const App: React.FC = () => {
  const [processes, setProcesses] = useState<Process[]>([]);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Dynamic options for tasks and assignees
  const [taskOptions, setTaskOptions] = useState<string[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);

  useEffect(() => {
    try {
      const savedProcesses = localStorage.getItem('processes');
      if (savedProcesses) {
        setProcesses(JSON.parse(savedProcesses));
      }
      const savedTaskOptions = localStorage.getItem('taskOptions');
      if (savedTaskOptions) {
        setTaskOptions(JSON.parse(savedTaskOptions));
      }
      const savedAssigneeOptions = localStorage.getItem('assigneeOptions');
      if (savedAssigneeOptions) {
        setAssigneeOptions(JSON.parse(savedAssigneeOptions));
      }
    } catch (error) {
      console.error("Error al cargar datos de localStorage", error);
    }
  }, []);

  const saveData = useCallback(<T,>(key: string, data: T) => {
    try {
      localStorage.setItem(key, JSON.stringify(data));
    } catch (error) {
      console.error(`Error al guardar ${key} en localStorage`, error);
    }
  }, []);

  useEffect(() => {
    saveData('processes', processes);
  }, [processes, saveData]);

  useEffect(() => {
    saveData('taskOptions', taskOptions);
  }, [taskOptions, saveData]);

  useEffect(() => {
    saveData('assigneeOptions', assigneeOptions);
  }, [assigneeOptions, saveData]);

  const handleOpenWizard = (processToEdit: Process | null = null) => {
    setEditingProcess(processToEdit);
    setIsWizardOpen(true);
  };

  const handleCloseWizard = () => {
    setIsWizardOpen(false);
    setEditingProcess(null);
  };

  const handleSaveProcess = (processData: { name: string; tasks: Omit<Task, 'id' | 'isComplete'>[] }) => {
    const now = new Date().toISOString();
    
    // Self-feeding logic for options
    const newTaskOptions = new Set(taskOptions);
    const newAssigneeOptions = new Set(assigneeOptions);
    processData.tasks.forEach(task => {
        if (task.name) newTaskOptions.add(task.name);
        if (task.assignee) newAssigneeOptions.add(task.assignee);
    });
    setTaskOptions(Array.from(newTaskOptions));
    setAssigneeOptions(Array.from(newAssigneeOptions));

    if (editingProcess) {
      // Update existing process
      setProcesses(processes.map(p =>
        p.id === editingProcess.id
          ? {
            ...p,
            name: processData.name,
            tasks: processData.tasks.map((t, index) => ({
              ...(p.tasks[index] || {}),
              id: p.tasks[index]?.id || `task-${Date.now()}-${index}`,
              name: t.name,
              assignee: t.assignee,
              followUpDate: t.followUpDate,
              comments: t.comments,
              isComplete: p.tasks[index]?.isComplete || false,
            })),
            status: 'Abierto', // Reopening always sets status to Abierto
            updatedAt: now,
          }
          : p
      ));
    } else {
      // Create new process
      const newProcess: Process = {
        id: `proc-${Date.now()}`,
        name: processData.name,
        tasks: processData.tasks.map((t, index) => ({
          ...t,
          id: `task-${Date.now()}-${index}`,
          isComplete: false,
        })),
        currentTaskIndex: 0,
        status: 'Abierto',
        createdAt: now,
        updatedAt: now,
      };
      setProcesses([...processes, newProcess]);
    }
    handleCloseWizard();
  };

  const handleCompleteTask = (processId: string, taskIndex: number) => {
    setProcesses(processes.map(p => {
      if (p.id === processId) {
        const newTasks = [...p.tasks];
        newTasks[taskIndex].isComplete = true;
        const isLastTask = taskIndex === p.tasks.length - 1;
        const now = new Date().toISOString();

        return {
          ...p,
          tasks: newTasks,
          currentTaskIndex: isLastTask ? p.currentTaskIndex : p.currentTaskIndex + 1,
          status: isLastTask ? 'Cerrado' : p.status,
          updatedAt: now,
          closedAt: isLastTask ? now : p.closedAt,
        };
      }
      return p;
    }));
  };

  const handleCloseProcess = (processId: string) => {
      const now = new Date().toISOString();
      setProcesses(processes.map(p => p.id === processId ? {...p, status: 'Cerrado', updatedAt: now, closedAt: now } : p));
  };
  
  const handleReopenProcess = (processToReopen: Process) => {
      handleOpenWizard(processToReopen);
  };


  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      <header className="bg-white shadow-md">
        <div className="container mx-auto px-6 py-4 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-800">Seguimiento de Procesos</h1>
          <div>
            <button
                onClick={() => setIsReportsOpen(true)}
                className="mr-4 px-5 py-2 bg-gray-700 text-white font-semibold rounded-lg shadow-md hover:bg-gray-800 focus:outline-none focus:ring-2 focus:ring-gray-600 focus:ring-opacity-75 transition-colors duration-200"
            >
                Reportes
            </button>
            <button
              onClick={() => handleOpenWizard()}
              className="px-5 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200"
            >
              + Nuevo Proceso
            </button>
          </div>
        </div>
      </header>
      <main className="container mx-auto px-6 py-8">
        {processes.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            {processes.map(proc => (
              <ProcessCard
                key={proc.id}
                process={proc}
                onCompleteTask={handleCompleteTask}
                onCloseProcess={handleCloseProcess}
                onReopenProcess={handleReopenProcess}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md">
            <h2 className="text-2xl font-semibold text-gray-700 mb-2">No hay procesos todavía.</h2>
            <p className="text-gray-500">¡Crea tu primer proceso para empezar a darle seguimiento!</p>
          </div>
        )}
      </main>
      {isWizardOpen && (
        <NewProcessWizard
          onClose={handleCloseWizard}
          onSave={handleSaveProcess}
          existingProcess={editingProcess}
          taskOptions={taskOptions}
          assigneeOptions={assigneeOptions}
        />
      )}
      {isReportsOpen && <ReportsModal processes={processes} onClose={() => setIsReportsOpen(false)} />}
    </div>
  );
};

// Wizard Modal Component
interface NewProcessWizardProps {
  onClose: () => void;
  onSave: (processData: { name: string; tasks: Omit<Task, 'id' | 'isComplete'>[] }) => void;
  existingProcess: Process | null;
  taskOptions: string[];
  assigneeOptions: string[];
}

const NewProcessWizard: React.FC<NewProcessWizardProps> = ({ onClose, onSave, existingProcess, taskOptions, assigneeOptions }) => {
  const [processName, setProcessName] = useState(existingProcess?.name || '');
  const [tasks, setTasks] = useState<Omit<Task, 'id' | 'isComplete'>[]>(existingProcess?.tasks || []);
  const [currentTask, setCurrentTask] = useState(initialTask);

  const handleAddTask = () => {
    if (!currentTask.name || !currentTask.assignee || !currentTask.followUpDate) {
      alert('Por favor, completa el nombre de la tarea, el responsable y la fecha.');
      return;
    }
    setTasks([...tasks, currentTask]);
    setCurrentTask(initialTask); // Reset for next task
  };

  const handleFinalSave = () => {
    if (!processName) {
      alert('Por favor, dale un nombre al proceso.');
      return;
    }
    
    let finalTasks = [...tasks];
    // Check if there is a partially filled task in the form
    if (currentTask.name && currentTask.assignee && currentTask.followUpDate) {
        finalTasks = [...tasks, currentTask];
    } else if (finalTasks.length === 0) {
        alert('Debes agregar al menos una tarea para guardar el proceso.');
        return;
    }

    onSave({ name: processName, tasks: finalTasks });
  };
  
  const handleInputChange = <K extends keyof typeof initialTask>(field: K, value: (typeof initialTask)[K]) => {
      setCurrentTask(prev => ({...prev, [field]: value}));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-3xl max-h-[90vh] flex flex-col">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">{existingProcess ? 'Editar Proceso' : 'Crear Nuevo Proceso'}</h2>
        <div className="flex-grow overflow-y-auto pr-4 -mr-4">
            <div className="mb-6">
            <label htmlFor="processName" className="block text-sm font-medium text-gray-700 mb-1">Nombre del Proceso</label>
            <input
                type="text"
                id="processName"
                value={processName}
                onChange={(e) => setProcessName(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                placeholder="Ej: Proceso de Onboarding de Cliente"
            />
            </div>
            
            {tasks.length > 0 && (
                <div className="mb-6">
                    <h3 className="text-lg font-semibold text-gray-700 mb-2">Tareas Agregadas</h3>
                    <ul className="space-y-2 max-h-40 overflow-y-auto bg-gray-50 p-3 rounded-md border">
                        {tasks.map((task, index) => (
                            <li key={index} className="text-sm text-gray-600 border-b pb-1">
                                <strong>{index + 1}. {task.name}</strong> - {task.assignee} ({new Date(task.followUpDate).toLocaleDateString()})
                                {task.comments && <p className="text-xs text-gray-500 pl-4 italic">"{task.comments}"</p>}
                            </li>
                        ))}
                    </ul>
                </div>
            )}
            
            <div className="border-t pt-4">
                <h3 className="text-lg font-semibold text-gray-700 mb-4">{tasks.length > 0 ? 'Próxima Tarea' : 'Primera Tarea'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="taskName" className="block text-sm font-medium text-gray-700 mb-1">Tarea</label>
                        <input
                            type="text"
                            id="taskName"
                            list="task-options"
                            value={currentTask.name}
                            onChange={(e) => handleInputChange('name', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                         <datalist id="task-options">
                            {taskOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>
                    <div>
                        <label htmlFor="assignee" className="block text-sm font-medium text-gray-700 mb-1">Responsable</label>
                        <input
                            type="text"
                            id="assignee"
                            list="assignee-options"
                            value={currentTask.assignee}
                            onChange={(e) => handleInputChange('assignee', e.target.value)}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                        <datalist id="assignee-options">
                            {assigneeOptions.map(opt => <option key={opt} value={opt} />)}
                        </datalist>
                    </div>
                    <div className="md:col-span-2">
                        <label htmlFor="followUpDate" className="block text-sm font-medium text-gray-700 mb-1">Día de Seguimiento</label>
                        <input
                            type="date"
                            id="followUpDate"
                            value={currentTask.followUpDate}
                            onChange={(e) => handleInputChange('followUpDate', e.target.value)}
                            className="w-full md:w-1/2 px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        />
                    </div>
                     <div className="md:col-span-2">
                        <label htmlFor="comments" className="block text-sm font-medium text-gray-700 mb-1">Comentarios (Opcional)</label>
                        <textarea
                            id="comments"
                            value={currentTask.comments}
                            onChange={(e) => handleInputChange('comments', e.target.value)}
                            rows={2}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Añadir notas o detalles importantes..."
                        ></textarea>
                    </div>
                </div>
            </div>
        </div>

        <div className="mt-8 pt-4 border-t flex justify-end gap-4">
          <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">Cancelar</button>
          <button onClick={handleAddTask} className="px-4 py-2 bg-blue-100 text-blue-800 font-semibold rounded-lg hover:bg-blue-200">Agregar Tarea y Continuar</button>
          <button onClick={handleFinalSave} className="px-4 py-2 bg-green-600 text-white font-semibold rounded-lg shadow-md hover:bg-green-700">
            Finalizar y Guardar Proceso
          </button>
        </div>
      </div>
    </div>
  );
};

// Reports Modal Component
interface ReportsModalProps {
    processes: Process[];
    onClose: () => void;
}

const ReportsModal: React.FC<ReportsModalProps> = ({ processes, onClose }) => {
    const [expandedProcessId, setExpandedProcessId] = useState<string | null>(null);

    const calculateDuration = (process: Process): string => {
        const start = new Date(process.createdAt);
        const end = process.closedAt ? new Date(process.closedAt) : new Date();
        const diffTime = Math.abs(end.getTime() - start.getTime());
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        return `${diffDays} día${diffDays !== 1 ? 's' : ''}`;
    };

    const formatDate = (dateString: string) => new Date(dateString).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });

    const handleExport = () => {
        let csvContent = "data:text/csv;charset=utf-8,";
        const headers = [
            "Nombre del Proceso", "Fecha de Inicio del Proceso", "Fecha de Última Actualización", "Duración Total (días)",
            "Número de Paso", "Nombre de la Tarea", "Responsable", "Fecha de Seguimiento de la Tarea", "Comentarios"
        ];
        csvContent += headers.join(",") + "\r\n";

        processes.forEach(p => {
            const duration = calculateDuration(p);
            p.tasks.forEach((task, index) => {
                const row = [
                    `"${p.name}"`,
                    formatDate(p.createdAt),
                    formatDate(p.updatedAt),
                    `"${duration}"`,
                    index + 1,
                    `"${task.name}"`,
                    `"${task.assignee}"`,
                    formatDate(task.followUpDate),
                    `"${task.comments.replace(/"/g, '""')}"` // Escape double quotes
                ];
                csvContent += row.join(",") + "\r\n";
            });
        });

        const encodedUri = encodeURI(csvContent);
        const link = document.createElement("a");
        link.setAttribute("href", encodedUri);
        link.setAttribute("download", "reporte_procesos.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const processReports = useMemo(() => processes.map(p => {
        const involved = Array.from(new Set(p.tasks.map(t => t.assignee))).join(', ');
        return {
            ...p,
            duration: calculateDuration(p),
            involved
        };
    }).sort((a,b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()), [processes]);

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center p-4">
            <div className="bg-white rounded-lg shadow-2xl p-8 w-full max-w-6xl max-h-[90vh] flex flex-col">
                <div className="flex justify-between items-center mb-6">
                    <h2 className="text-3xl font-bold text-gray-800">Reporte de Procesos</h2>
                    <div>
                        <button onClick={handleExport} className="mr-4 px-4 py-2 bg-green-600 text-white font-semibold rounded-lg hover:bg-green-700 transition-colors">
                            Exportar a Excel
                        </button>
                        <button onClick={onClose} className="px-4 py-2 bg-gray-200 text-gray-800 font-semibold rounded-lg hover:bg-gray-300">
                            Cerrar
                        </button>
                    </div>
                </div>
                <div className="flex-grow overflow-y-auto">
                    <div className="space-y-4">
                        {processReports.length > 0 ? processReports.map(p => (
                            <div key={p.id} className="bg-gray-50 border rounded-lg p-4">
                               <div className="grid grid-cols-1 md:grid-cols-6 gap-4 items-center">
                                    <div className="md:col-span-2">
                                        <p className="font-bold text-lg text-blue-700">{p.name}</p>
                                        <p className={`text-sm font-semibold ${p.status === 'Abierto' ? 'text-green-600' : 'text-red-600'}`}>{p.status}</p>
                                    </div>
                                    <div><p className="text-sm text-gray-600"><strong className="block text-gray-800">Fecha Inicio:</strong> {formatDate(p.createdAt)}</p></div>
                                    <div><p className="text-sm text-gray-600"><strong className="block text-gray-800">Últ. Act:</strong> {formatDate(p.updatedAt)}</p></div>
                                    <div><p className="text-sm text-gray-600"><strong className="block text-gray-800">Duración:</strong> {p.duration}</p></div>
                                    <div className="text-right">
                                        <button 
                                            onClick={() => setExpandedProcessId(expandedProcessId === p.id ? null : p.id)}
                                            className="px-3 py-1 bg-blue-100 text-blue-800 text-sm font-semibold rounded hover:bg-blue-200"
                                        >
                                            {expandedProcessId === p.id ? 'Ocultar Detalles' : 'Ver Detalles'}
                                        </button>
                                    </div>
                               </div>
                               {expandedProcessId === p.id && (
                                   <div className="mt-4 pt-4 border-t">
                                       <h4 className="font-semibold mb-2">Detalle de Tareas:</h4>
                                       <table className="w-full text-sm text-left text-gray-500">
                                            <thead className="text-xs text-gray-700 uppercase bg-gray-100">
                                                <tr>
                                                    <th scope="col" className="px-4 py-2">Paso</th>
                                                    <th scope="col" className="px-4 py-2">Tarea</th>
                                                    <th scope="col" className="px-4 py-2">Responsable</th>
                                                    <th scope="col" className="px-4 py-2">Fecha Seguimiento</th>
                                                    <th scope="col" className="px-4 py-2">Comentarios</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {p.tasks.map((task, index) => (
                                                    <tr key={task.id} className="bg-white border-b">
                                                        <td className="px-4 py-2">{index + 1}</td>
                                                        <td className="px-4 py-2 font-medium text-gray-900">{task.name}</td>
                                                        <td className="px-4 py-2">{task.assignee}</td>
                                                        <td className="px-4 py-2">{formatDate(task.followUpDate)}</td>
                                                        <td className="px-4 py-2 italic">{task.comments || '-'}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                       </table>
                                   </div>
                               )}
                            </div>
                        )) : <p className="text-gray-500 text-center py-8">No hay procesos para reportar.</p>}
                    </div>
                </div>
            </div>
        </div>
    );
};


export default App;
