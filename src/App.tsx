
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Process, Task } from './types.ts';
import ProcessCard from './ProcessCard.tsx';
import { fetchData, updateData } from './api.ts';

const CORRECT_PASSWORD = 'Orobio43210';

const initialTask: Omit<Task, 'id' | 'isComplete'> = {
  name: '',
  assignee: '',
  followUpDate: new Date().toISOString().split('T')[0],
  comments: ''
};

// Password Modal Component
const PasswordModal = ({ onLogin }: { onLogin: (password: string) => void }) => {
  const [password, setPassword] = useState('');
  const [error, setError] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password === CORRECT_PASSWORD) {
        onLogin(password);
    } else {
        setError(true);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-100 flex justify-center items-center">
      <div className="bg-white rounded-lg shadow-xl p-8 w-full max-w-sm">
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-6">Acceso Protegido</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Contraseña
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setError(false);
              }}
              className={`w-full px-3 py-2 border rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 ${error ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="Introduce la contraseña"
              autoFocus
            />
            {error && <p className="text-red-500 text-xs mt-1">Contraseña incorrecta.</p>}
          </div>
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-600 text-white font-semibold rounded-lg shadow-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-75 transition-colors duration-200"
          >
            Entrar
          </button>
        </form>
      </div>
    </div>
  );
};


// Main App Component
const App: React.FC = () => {
  // Authentication State
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Data State
  const [processes, setProcesses] = useState<Process[]>([]);
  const [taskOptions, setTaskOptions] = useState<string[]>([]);
  const [assigneeOptions, setAssigneeOptions] = useState<string[]>([]);
  
  // UI State
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [editingProcess, setEditingProcess] = useState<Process | null>(null);
  const [isReportsOpen, setIsReportsOpen] = useState(false);

  // Check session storage for authentication on component mount
  useEffect(() => {
    try {
      if (sessionStorage.getItem('isAuthenticated') === 'true') {
        setIsAuthenticated(true);
      } else {
        setIsLoading(false); // Stop loading if not authenticated
      }
    } catch (e) {
      console.error("No se pudo leer de sessionStorage", e);
      setIsLoading(false);
    }
  }, []);
  
  // Cargar datos iniciales desde la base de datos central, solo si está autenticado
  useEffect(() => {
    if (!isAuthenticated) return;

    const loadData = async () => {
      try {
        setIsLoading(true);
        const remoteData = await fetchData();
        setProcesses(remoteData.processes || []);
        setTaskOptions(remoteData.taskOptions || []);
        setAssigneeOptions(remoteData.assigneeOptions || []);
        setError(null);
      } catch (err: any) {
        setError(err.message);
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, [isAuthenticated]);
  
  const handleLoginAttempt = () => {
    try {
      sessionStorage.setItem('isAuthenticated', 'true');
    } catch(e) {
      console.error("No se pudo escribir en sessionStorage", e);
    }
    setIsAuthenticated(true);
  };

  // Función central para actualizar el estado local y remoto
  const updateStateAndPersist = useCallback(async (newProcesses: Process[], newTaskOptions: string[], newAssigneeOptions: string[]) => {
      // Actualización optimista de la UI para una respuesta rápida
      setProcesses(newProcesses);
      setTaskOptions(newTaskOptions);
      setAssigneeOptions(newAssigneeOptions);

      // Guardar en la base de datos central
      try {
        await updateData({
          processes: newProcesses,
          taskOptions: newTaskOptions,
          assigneeOptions: newAssigneeOptions,
        });
      } catch (err) {
          console.error("Error al guardar en la base de datos:", err);
          alert("Error: No se pudieron guardar los cambios. Por favor, revisa tu conexión o la configuración de la API.");
          // Aquí se podría implementar una lógica para revertir el cambio
      }
  }, []);


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
    
    const updatedTaskOptionsSet = new Set(taskOptions);
    const updatedAssigneeOptionsSet = new Set(assigneeOptions);
    processData.tasks.forEach(task => {
        if (task.name) updatedTaskOptionsSet.add(task.name);
        if (task.assignee) updatedAssigneeOptionsSet.add(task.assignee);
    });

    let updatedProcesses;
    if (editingProcess) {
      updatedProcesses = processes.map(p =>
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
            status: 'Abierto',
            updatedAt: now,
            closedAt: null, // Ensure reopened process doesn't stay closed
          }
          : p
      );
    } else {
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
      updatedProcesses = [...processes, newProcess];
    }
    
    updateStateAndPersist(updatedProcesses, Array.from(updatedTaskOptionsSet), Array.from(updatedAssigneeOptionsSet));
    handleCloseWizard();
  };

  const handleCompleteTask = (processId: string, taskIndex: number) => {
    const now = new Date().toISOString();
    const updatedProcesses = processes.map(p => {
      if (p.id === processId) {
        const newTasks = [...p.tasks];
        newTasks[taskIndex].isComplete = true;
        const isLastTask = taskIndex === p.tasks.length - 1;

        return {
          ...p,
          tasks: newTasks,
          currentTaskIndex: isLastTask ? p.currentTaskIndex : p.currentTaskIndex + 1,
          status: isLastTask ? 'Cerrado' as const : p.status,
          updatedAt: now,
          closedAt: isLastTask ? now : p.closedAt,
        };
      }
      return p;
    });

    updateStateAndPersist(updatedProcesses, taskOptions, assigneeOptions);
  };

  const handleCloseProcess = (processId: string) => {
      const now = new Date().toISOString();
      const updatedProcesses = processes.map(p => p.id === processId ? {...p, status: 'Cerrado' as const, updatedAt: now, closedAt: now } : p);
      updateStateAndPersist(updatedProcesses, taskOptions, assigneeOptions);
  };
  
  const handleReopenProcess = (processToReopen: Process) => {
      handleOpenWizard(processToReopen);
  };
  
  if (!isAuthenticated) {
    return <PasswordModal onLogin={handleLoginAttempt} />;
  }

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
        {isLoading && (
          <div className="text-center py-16 px-6">
            <h2 className="text-2xl font-semibold text-gray-700">Cargando datos desde la nube...</h2>
          </div>
        )}
        {error && (
            <div className="text-center py-16 px-6 bg-red-100 text-red-800 rounded-lg shadow-md">
                <h2 className="text-2xl font-semibold mb-2">Error de Conexión</h2>
                <p>{error}</p>
                <p className="mt-2 text-sm">Por favor, revisa el archivo <strong>src/api.ts</strong> y asegúrate de que tu API Key y Bin ID son correctos.</p>
            </div>
        )}
        {!isLoading && !error && processes.length > 0 ? (
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
          !isLoading && !error && (
            <div className="text-center py-16 px-6 bg-white rounded-lg shadow-md">
              <h2 className="text-2xl font-semibold text-gray-700 mb-2">No hay procesos todavía.</h2>
              <p className="text-gray-500">¡Crea tu primer proceso para empezar a darle seguimiento!</p>
            </div>
          )
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
