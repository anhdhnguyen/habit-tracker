import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { ChevronDown, ChevronUp, Edit2, PlusCircle, Save, Settings, TrendingUp, MessageSquare, CalendarDays, ListChecks, Trash2, Copy, Eye, EyeOff, Palette } from 'lucide-react';

// Utility function to get dates for the last N days
const getLastNDates = (days) => {
  const dates = [];
  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    dates.push(date.toISOString().split('T')[0]);
  }
  return dates.reverse(); // Oldest to newest
};

// Initial Data (or load from localStorage) - Removed dailyGoal and unit
const initialHabits = [
  { id: 'h1', name: 'Exercise', group: 'Health', order: 0, archived: false },
  { id: 'h2', name: 'Read', group: 'Personal Growth', order: 1, archived: false },
  { id: 'h3', name: 'Meditate', group: 'Wellbeing', order: 2, archived: false },
  { id: 'h4', name: 'Drink Water', group: 'Health', order: 3, archived: false },
  { id: 'h5', name: 'No Sugar', group: 'Health', order: 4, archived: true },
];

const initialEntries = {
  // 'YYYY-MM-DD': { 'habitId': { score: 0, note: '' } }
};

const initialGroups = ['Health', 'Personal Growth', 'Wellbeing', 'Work', 'Chores', 'Uncategorized'];

// Colors for habit trendlines on dashboard
const habitColors = [
  '#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6',
  '#1abc9c', '#d35400', '#34495e', '#c0392b', '#8e44ad'
];


const App = () => {
  const [habits, setHabits] = useState(() => {
    const savedHabits = localStorage.getItem('habits_v2'); // Changed key for new structure
    try {
        const parsedHabits = savedHabits ? JSON.parse(savedHabits) : initialHabits;
        // Ensure all habits have an order property if migrating from old data
        return parsedHabits.map((h, index) => ({ ...h, order: h.order !== undefined ? h.order : index }));
    } catch (e) {
        console.error("Error parsing habits from localStorage", e);
        return initialHabits.map((h, index) => ({ ...h, order: h.order !== undefined ? h.order : index }));
    }
  });
  const [entries, setEntries] = useState(() => {
    const savedEntries = localStorage.getItem('habitEntries_v2'); // Changed key
    return savedEntries ? JSON.parse(savedEntries) : initialEntries;
  });
  const [groups, setGroups] = useState(() => {
    const savedGroups = localStorage.getItem('habitGroups_v2'); // Changed key
    return savedGroups ? JSON.parse(savedGroups) : initialGroups;
  });

  const [currentScreen, setCurrentScreen] = useState('log'); // 'log', 'dashboard', 'settings'
  const [dates, setDates] = useState(getLastNDates(14));
  const [showArchived, setShowArchived] = useState(false);

  // Persist to localStorage
  useEffect(() => {
    localStorage.setItem('habits_v2', JSON.stringify(habits));
  }, [habits]);

  useEffect(() => {
    localStorage.setItem('habitEntries_v2', JSON.stringify(entries));
  }, [entries]);

  useEffect(() => {
    localStorage.setItem('habitGroups_v2', JSON.stringify(groups));
  }, [groups]);

  const visibleHabits = useMemo(() => {
    return habits
      .filter(h => showArchived ? true : !h.archived)
      .sort((a, b) => {
        if (a.group < b.group) return -1;
        if (a.group > b.group) return 1;
        return a.order - b.order;
      });
  }, [habits, showArchived]);

  const groupedVisibleHabits = useMemo(() => {
    const grouped = {};
    visibleHabits.forEach(habit => {
        const groupName = habit.group || 'Uncategorized';
        if (!grouped[groupName]) {
            grouped[groupName] = [];
        }
        grouped[groupName].push(habit);
    });
    // Sort groups by name, but ensure 'Uncategorized' is last if it exists
    const sortedGroupNames = Object.keys(grouped).sort((a, b) => {
        if (a === 'Uncategorized') return 1;
        if (b === 'Uncategorized') return -1;
        return a.localeCompare(b);
    });
    
    const result = {};
    sortedGroupNames.forEach(name => result[name] = grouped[name].sort((a,b) => a.order - b.order));
    return result;
  }, [visibleHabits]);


  const updateHabitEntry = (date, habitId, score, note) => { // Removed value
    setEntries(prevEntries => {
      const newEntries = { ...prevEntries };
      if (!newEntries[date]) {
        newEntries[date] = {};
      }
      const currentEntry = newEntries[date][habitId] || {};
      newEntries[date][habitId] = {
        score: score !== undefined ? score : currentEntry.score,
        note: note !== undefined ? note : currentEntry.note,
      };
      return newEntries;
    });
  };

  const addHabit = (name, group) => { // Removed dailyGoal, unit
    const newHabit = {
      id: `h${Date.now()}`,
      name,
      group: group || 'Uncategorized',
      order: habits.filter(h => h.group === (group || 'Uncategorized')).length, // Order within the group
      archived: false,
    };
    setHabits(prevHabits => [...prevHabits, newHabit]);
  };

  const editHabit = (id, updatedData) => { // Removed dailyGoal, unit from updatedData
    setHabits(prevHabits =>
      prevHabits.map(h => (h.id === id ? { ...h, ...updatedData, group: updatedData.group || 'Uncategorized' } : h))
    );
  };
  
  const toggleArchiveHabit = (id) => {
    setHabits(prevHabits =>
      prevHabits.map(h => (h.id === id ? { ...h, archived: !h.archived } : h))
    );
  };

  const deleteHabit = (id) => {
    if (window.confirm("Are you sure you want to delete this habit and all its entries? This cannot be undone.")) {
      setHabits(prevHabits => prevHabits.filter(h => h.id !== id));
      setEntries(prevEntries => {
        const newEntries = { ...prevEntries };
        Object.keys(newEntries).forEach(date => {
          delete newEntries[date][id];
        });
        return newEntries;
      });
    }
  };

  const moveHabit = (id, direction) => {
    setHabits(prevHabits => {
        const newHabits = [...prevHabits];
        const habitIndex = newHabits.findIndex(h => h.id === id);
        if (habitIndex === -1) return newHabits;

        const habitToMove = newHabits[habitIndex];
        const habitsInSameGroup = newHabits
            .filter(h => h.group === habitToMove.group)
            .sort((a, b) => a.order - b.order);

        const currentIndexInGroup = habitsInSameGroup.findIndex(h => h.id === id);
        
        let targetIndexInGroup;
        if (direction === 'up') {
            if (currentIndexInGroup === 0) return newHabits; // Already at the top of its group
            targetIndexInGroup = currentIndexInGroup - 1;
        } else {
            if (currentIndexInGroup === habitsInSameGroup.length - 1) return newHabits; // Already at the bottom
            targetIndexInGroup = currentIndexInGroup + 1;
        }

        // Swap order with the target habit in the same group
        const otherHabitInGroup = habitsInSameGroup[targetIndexInGroup];
        const otherHabitGlobalIndex = newHabits.findIndex(h => h.id === otherHabitInGroup.id);

        if (otherHabitGlobalIndex !== -1) {
            const tempOrder = newHabits[habitIndex].order;
            newHabits[habitIndex].order = newHabits[otherHabitGlobalIndex].order;
            newHabits[otherHabitGlobalIndex].order = tempOrder;
        }
        
        return newHabits.sort((a,b) => { // Primary sort by group, secondary by new order
            if (a.group < b.group) return -1;
            if (a.group > b.group) return 1;
            return a.order - b.order;
        });
    });
};
  
  const duplicateHabit = (habitId) => {
    const habitToDuplicate = habits.find(h => h.id === habitId);
    if (!habitToDuplicate) return;

    const newHabit = {
      ...habitToDuplicate,
      id: `h${Date.now()}`,
      name: `${habitToDuplicate.name} (Copy)`,
      order: habits.filter(h => h.group === habitToDuplicate.group).length,
    };
    setHabits(prevHabits => [...prevHabits, newHabit]);
  };

  const calculateDailyScore = (date) => {
    if (!entries[date]) return 0;
    return Object.values(entries[date]).reduce((sum, entry) => sum + (entry.score || 0), 0);
  };

  // Screen Components
  const HabitLogScreen = () => {
    const [editingHabit, setEditingHabit] = useState(null); // habit object
    const [inlineNoteEdit, setInlineNoteEdit] = useState({ date: null, habitId: null, text: '' });


    const handleScoreChange = (date, habitId, increment) => {
      const currentScore = entries[date]?.[habitId]?.score || 0;
      let newScore = currentScore + increment;
      newScore = Math.max(-3, Math.min(3, newScore)); // Clamp between -3 and 3
      updateHabitEntry(date, habitId, newScore, entries[date]?.[habitId]?.note);
    };

    const handleNoteChange = (date, habitId, newNote) => {
      updateHabitEntry(date, habitId, entries[date]?.[habitId]?.score, newNote);
    };

    const startInlineNoteEdit = (date, habitId, currentNote) => {
        setInlineNoteEdit({ date, habitId, text: currentNote || '' });
    };

    const saveInlineNote = () => {
        if (inlineNoteEdit.date && inlineNoteEdit.habitId) {
            handleNoteChange(inlineNoteEdit.date, inlineNoteEdit.habitId, inlineNoteEdit.text);
        }
        setInlineNoteEdit({ date: null, habitId: null, text: '' }); // Close editor
    };
    
    const openHabitEditor = (habit) => {
      setEditingHabit(habit);
    };

    const closeHabitEditor = () => {
      setEditingHabit(null);
    };

    const saveEditedHabit = (id, name, group) => { // Removed dailyGoal, unit
      editHabit(id, { name, group });
      closeHabitEditor();
    };
    
    const [newHabitName, setNewHabitName] = useState('');
    const [newHabitGroup, setNewHabitGroup] = useState(groups.includes('Uncategorized') ? 'Uncategorized' : groups[0] || '');
    const [showAddHabitForm, setShowAddHabitForm] = useState(false);

    const handleAddHabit = (e) => {
      e.preventDefault();
      if (newHabitName.trim() === '') return;
      addHabit(newHabitName.trim(), newHabitGroup);
      setNewHabitName('');
      setNewHabitGroup(groups.includes('Uncategorized') ? 'Uncategorized' : groups[0] || '');
      setShowAddHabitForm(false);
    };

    const getDayOfWeek = (dateString) => {
        const date = new Date(dateString + 'T00:00:00'); // Ensure correct date parsing
        return date.toLocaleDateString('en-US', { weekday: 'short' });
    };

    return (
      <div className="p-2 sm:p-4 space-y-6">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
          <h1 className="text-2xl sm:text-3xl font-bold text-indigo-600 mb-2 sm:mb-0">Habit Log</h1>
          <button
            onClick={() => setShowAddHabitForm(!showAddHabitForm)}
            className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-3 sm:px-4 rounded-lg shadow-md flex items-center transition duration-150 text-sm sm:text-base"
          >
            <PlusCircle size={20} className="mr-2" /> Add Habit
          </button>
        </div>

        {showAddHabitForm && (
          <form onSubmit={handleAddHabit} className="bg-white p-4 sm:p-6 rounded-lg shadow-lg space-y-4 mb-6">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-700">Add New Habit</h2>
            <div>
              <label htmlFor="newHabitName" className="block text-sm font-medium text-gray-600">Name</label>
              <input
                type="text"
                id="newHabitName"
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="e.g., Morning Run"
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                required
              />
            </div>
            <div>
              <label htmlFor="newHabitGroup" className="block text-sm font-medium text-gray-600">Group</label>
              <select
                id="newHabitGroup"
                value={newHabitGroup}
                onChange={(e) => setNewHabitGroup(e.target.value)}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              >
                {groups.map(g => <option key={g} value={g}>{g}</option>)}
              </select>
            </div>
            <button type="submit" className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center justify-center transition duration-150">
              <Save size={20} className="mr-2" /> Save Habit
            </button>
          </form>
        )}
        
        <div className="flex justify-end mb-4">
            <button
                onClick={() => setShowArchived(!showArchived)}
                className="text-sm text-indigo-600 hover:text-indigo-800 font-medium flex items-center"
            >
                {showArchived ? <EyeOff size={16} className="mr-1" /> : <Eye size={16} className="mr-1" />}
                {showArchived ? 'Hide Archived' : 'Show Archived'} ({habits.filter(h => h.archived).length})
            </button>
        </div>

        {/* Habit Table */}
        <div className="overflow-x-auto bg-white shadow-xl rounded-lg">
          <table className="min-w-full">
            <thead className="bg-gray-100">
              <tr>
                <th className="sticky left-0 bg-gray-100 z-10 p-2 sm:p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-left w-1/3 md:w-1/4">Habit</th>
                {dates.map(date => (
                  <th key={date} className="p-2 sm:p-3 text-xs font-semibold text-gray-600 uppercase tracking-wider text-center whitespace-nowrap min-w-[100px]">
                    {new Date(date + 'T00:00:00').toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })} <br/>
                    <span className="text-indigo-500 font-bold">{calculateDailyScore(date)}</span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(groupedVisibleHabits).map(([groupName, habitsInGroup]) => (
                <React.Fragment key={groupName}>
                  <tr>
                    <td colSpan={dates.length + 1} className="sticky left-0 bg-gray-200 z-10 p-2 font-semibold text-sm text-gray-700">
                      {groupName}
                    </td>
                  </tr>
                  {habitsInGroup.map((habit, habitIndex) => (
                    <tr key={habit.id} className={`${habit.archived ? 'bg-gray-50 opacity-60' : ''} hover:bg-gray-50 transition-colors duration-150`}>
                      <td className="sticky left-0 bg-white z-[5] p-2 sm:p-3 whitespace-nowrap w-1/3 md:w-1/4 align-top">
                        <div className="flex items-start space-x-1 sm:space-x-2">
                           <div className="flex flex-col items-center">
                            <button onClick={() => moveHabit(habit.id, 'up')} 
                                    disabled={habitsInGroup.findIndex(h => h.id === habit.id) === 0} 
                                    className="disabled:opacity-30 text-gray-400 hover:text-indigo-500 p-0.5"><ChevronUp size={16}/></button>
                            <button onClick={() => moveHabit(habit.id, 'down')} 
                                    disabled={habitsInGroup.findIndex(h => h.id === habit.id) === habitsInGroup.length - 1} 
                                    className="disabled:opacity-30 text-gray-400 hover:text-indigo-500 p-0.5"><ChevronDown size={16}/></button>
                           </div>
                          <div className="flex-grow">
                            <div className="font-semibold text-gray-800 text-sm">{habit.name}</div>
                            {/* Group name is now a header, so removed from here */}
                          </div>
                          <div className="ml-auto flex flex-col sm:flex-row space-y-1 sm:space-y-0 sm:space-x-1">
                            <button onClick={() => openHabitEditor(habit)} className="text-gray-400 hover:text-blue-500 p-1 rounded-full"><Edit2 size={14}/></button>
                            <button onClick={() => toggleArchiveHabit(habit.id)} className={`p-1 rounded-full ${habit.archived ? 'text-yellow-500 hover:text-yellow-600' : 'text-gray-400 hover:text-gray-600'}`}>
                                {habit.archived ? <Eye size={14}/> : <EyeOff size={14}/>}
                            </button>
                            <button onClick={() => duplicateHabit(habit.id)} className="text-gray-400 hover:text-green-500 p-1 rounded-full"><Copy size={14}/></button>
                            {!habit.archived && <button onClick={() => deleteHabit(habit.id)} className="text-gray-400 hover:text-red-500 p-1 rounded-full"><Trash2 size={14}/></button>}
                          </div>
                        </div>
                      </td>
                      {dates.map(date => {
                        const entry = entries[date]?.[habit.id] || { score: 0, note: '' };
                        const scoreColor = entry.score > 0 ? 'text-green-500' : entry.score < 0 ? 'text-red-500' : 'text-gray-400';
                        const isEditingNote = inlineNoteEdit.date === date && inlineNoteEdit.habitId === habit.id;

                        return (
                          <td key={date} className="p-2 sm:p-3 text-center whitespace-nowrap align-top min-w-[100px]">
                            <div className="flex flex-col items-center space-y-1">
                              <div className="flex items-center space-x-1">
                                <button onClick={() => handleScoreChange(date, habit.id, -1)} className="text-red-400 hover:text-red-600 p-1 rounded-full bg-red-100 hover:bg-red-200 text-xs sm:text-sm">-</button>
                                <span className={`font-bold text-base sm:text-lg w-5 sm:w-6 text-center ${scoreColor}`}>{entry.score}</span>
                                <button onClick={() => handleScoreChange(date, habit.id, 1)} className="text-green-400 hover:text-green-600 p-1 rounded-full bg-green-100 hover:bg-green-200 text-xs sm:text-sm">+</button>
                              </div>
                               {isEditingNote ? (
                                    <div className="w-full">
                                        <input
                                            type="text"
                                            value={inlineNoteEdit.text}
                                            onChange={(e) => setInlineNoteEdit({...inlineNoteEdit, text: e.target.value})}
                                            onBlur={saveInlineNote}
                                            onKeyDown={(e) => e.key === 'Enter' && saveInlineNote()}
                                            className="w-full text-xs p-1 border border-indigo-300 rounded-md"
                                            autoFocus
                                        />
                                    </div>
                                ) : (
                                    <div 
                                        onClick={() => startInlineNoteEdit(date, habit.id, entry.note)} 
                                        className={`w-full text-xs text-gray-600 p-1 rounded-md min-h-[24px] cursor-pointer hover:bg-gray-100 ${entry.note ? 'italic' : 'text-gray-400'}`}
                                        title={entry.note || "Click to add note"}
                                    >
                                        {entry.note || <span className="flex items-center justify-center"><MessageSquare size={12} /></span>}
                                    </div>
                                )}
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </React.Fragment>
              ))}
               {Object.keys(groupedVisibleHabits).length === 0 && (
                    <tr>
                        <td colSpan={dates.length + 1} className="text-center text-gray-500 py-10">
                            No habits to display. Add some habits to get started!
                        </td>
                    </tr>
                )}
            </tbody>
          </table>
        </div>

        {editingHabit && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <form onSubmit={(e) => {
                e.preventDefault();
                saveEditedHabit(editingHabit.id, e.target.habitName.value, e.target.habitGroup.value);
            }} className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md space-y-4">
              <h3 className="text-lg font-semibold text-gray-700">Edit Habit: {editingHabit.name}</h3>
              <div>
                <label htmlFor="habitName" className="block text-sm font-medium text-gray-600">Name</label>
                <input type="text" name="habitName" defaultValue={editingHabit.name} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm" required />
              </div>
              <div>
                <label htmlFor="habitGroup" className="block text-sm font-medium text-gray-600">Group</label>
                <select name="habitGroup" defaultValue={editingHabit.group} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm">
                  {groups.map(g => <option key={g} value={g}>{g}</option>)}
                </select>
              </div>
              <div className="mt-4 flex justify-end space-x-2">
                <button type="button" onClick={closeHabitEditor} className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 hover:bg-gray-300 rounded-md">Cancel</button>
                <button type="submit" className="px-4 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-md">Save Changes</button>
              </div>
            </form>
          </div>
        )}
      </div>
    );
  };

  const DashboardScreen = () => {
    const last14Days = useMemo(() => getLastNDates(14), []);

    const dailyData = useMemo(() => {
        return last14Days.map(date => {
            const totalScore = calculateDailyScore(date);
            const habitScores = {};
            visibleHabits.forEach(habit => {
                habitScores[habit.id] = entries[date]?.[habit.id]?.score || 0;
            });
            return { date, totalScore, habitScores };
        });
    }, [entries, last14Days, visibleHabits]);

    const maxAbsScore = useMemo(() => {
        let max = 5; // Minimum scale for the chart
        dailyData.forEach(d => {
            if (Math.abs(d.totalScore) > max) max = Math.abs(d.totalScore);
            // No need to check individual habit scores for bar height, only for trendlines
        });
        return max;
    }, [dailyData]);

    const trendTips = useMemo(() => {
        const tips = [];
        if (visibleHabits.length < 2) return ["Add more habits to see trend insights."];
        const habitData = {}; 
        visibleHabits.forEach(h => habitData[h.id] = []);

        last14Days.forEach(date => {
            visibleHabits.forEach(habit => {
                const score = entries[date]?.[habit.id]?.score || 0;
                habitData[habit.id].push(score);
            });
        });

        for (let i = 0; i < visibleHabits.length; i++) {
            for (let j = i + 1; j < visibleHabits.length; j++) {
                const habitA = visibleHabits[i];
                const habitB = visibleHabits[j];
                let lowAlowB = 0;
                let highAhighB = 0;

                for (let k = 0; k < last14Days.length; k++) {
                    const scoreA = habitData[habitA.id][k];
                    const scoreB = habitData[habitB.id][k];
                    if (scoreA < 0 && scoreB < 0) lowAlowB++;
                    if (scoreA > 0 && scoreB > 0) highAhighB++;
                }
                
                const threshold = last14Days.length * 0.4; // Correlated on >40% of days
                if (lowAlowB > threshold) tips.push(`When '${habitA.name}' is low, '${habitB.name}' also tends to be low.`);
                if (highAhighB > threshold) tips.push(`When '${habitA.name}' is high, '${habitB.name}' also tends to be high.`);
            }
        }
        return tips.length > 0 ? tips : ["Keep tracking to find insights!"];
    }, [visibleHabits, entries, last14Days]);

    // SVG Chart Constants
    const chartHeight = 256; // h-64
    const chartPaddingTop = 20;
    const chartPaddingBottom = 30; // For date labels
    const usableChartHeight = chartHeight - chartPaddingTop - chartPaddingBottom;
    
    const getPathD = (scores, maxVal, numPoints, chartWidth) => {
        if (scores.length === 0) return "";
        const stepX = chartWidth / Math.max(1, numPoints -1);
        let path = `M 0 ${usableChartHeight / 2 - (scores[0] / maxVal) * (usableChartHeight / 2) + chartPaddingTop}`;
        scores.forEach((score, i) => {
            if (i > 0) {
                const x = i * stepX;
                const y = usableChartHeight / 2 - (score / maxVal) * (usableChartHeight / 2) + chartPaddingTop;
                path += ` L ${x} ${y}`;
            }
        });
        return path;
    };


    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold text-green-600">Dashboard</h1>

            <div className="bg-white p-4 sm:p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-1">Daily Score Trend (Last 14 Days)</h2>
                <div className="text-xs text-gray-500 mb-4">Bars show total daily score. Lines show individual habit trends.</div>
                
                <div className="relative" style={{ height: `${chartHeight}px` }}>
                    {/* Bars */}
                    <div className="flex items-end h-full space-x-1 md:space-x-2 absolute bottom-0 left-0 right-0 z-0" style={{ paddingBottom: `${chartPaddingBottom}px`}}>
                        {dailyData.map(({ date, totalScore }, index) => {
                            const barHeightPercent = maxAbsScore === 0 ? 0 : (Math.abs(totalScore) / maxAbsScore) * (usableChartHeight / chartHeight * 100 / 2);
                            const barColor = totalScore > 0 ? 'bg-green-400' : totalScore < 0 ? 'bg-red-400' : 'bg-gray-300';
                            const barTransform = totalScore >=0 ? `translateY(0)` : `translateY(${barHeightPercent}%)`;
                            const barPosition = totalScore >=0 ? `bottom-[${usableChartHeight/2}px]` : `top-[${usableChartHeight/2}px]` // This is tricky with dynamic tailwind

                            return (
                                <div key={date} className="flex flex-col items-center flex-grow min-w-[20px] sm:min-w-[30px] h-full justify-center relative">
                                    <div
                                        className={`w-full rounded-t-sm ${barColor} transition-all duration-300 ease-in-out absolute`}
                                        style={{ 
                                            height: `${barHeightPercent}%`,
                                            ...(totalScore >= 0 ? { bottom: `${usableChartHeight/2 + chartPaddingTop}px` } : { top: `${usableChartHeight/2 + chartPaddingTop}px` })
                                        }}
                                        title={`Total Score: ${totalScore}`}
                                    ></div>
                                </div>
                            );
                        })}
                    </div>
                    {/* Trendlines SVG */}
                    <svg width="100%" height={chartHeight} className="absolute top-0 left-0 z-10">
                        {/* Y-axis zero line */}
                        <line x1="0" y1={usableChartHeight / 2 + chartPaddingTop} x2="100%" y2={usableChartHeight / 2 + chartPaddingTop} stroke="#cbd5e1" strokeDasharray="4 2" />
                        
                        {/* Total Score Trendline */}
                        <path 
                            d={getPathD(dailyData.map(d => d.totalScore), maxAbsScore, dailyData.length, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 300)} // Estimate width
                            stroke="#4f46e5" 
                            fill="none" 
                            strokeWidth="2.5"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                        />
                        {/* Individual Habit Trendlines */}
                        {visibleHabits.filter(h => !h.archived).map((habit, habitIndex) => {
                             const habitScores = dailyData.map(d => d.habitScores[habit.id] || 0);
                             return (
                                <path
                                    key={habit.id}
                                    d={getPathD(habitScores, 3, dailyData.length, typeof window !== 'undefined' ? window.innerWidth * 0.8 : 300)} // Max score for habit is 3
                                    stroke={habitColors[habitIndex % habitColors.length]}
                                    fill="none"
                                    strokeWidth="1.5"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    opacity="0.7"
                                />
                             );
                        })}
                    </svg>
                     {/* Date Labels (below bars/lines) */}
                    <div className="flex items-end h-full space-x-1 md:space-x-2 absolute bottom-0 left-0 right-0" style={{ height: `${chartPaddingBottom}px`}}>
                         {dailyData.map(({ date }) => {
                            const d = new Date(date + 'T00:00:00');
                            const isToday = date === new Date().toISOString().split('T')[0];
                            return (
                                <div key={`label-${date}`} className="flex flex-col items-center flex-grow min-w-[20px] sm:min-w-[30px] justify-end h-full">
                                    <div className={`text-xs text-center ${isToday ? 'text-indigo-600 font-bold' : 'text-gray-500'}`}>
                                        {d.toLocaleDateString('en-GB', { weekday: 'short' })}<br/>
                                        {d.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit' })}
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
                <div className="mt-6 flex flex-wrap gap-2 items-center">
                    <div className="flex items-center mr-4">
                        <div className="w-4 h-1 bg-[#4f46e5] rounded-full mr-1.5" style={{height: '5px'}}></div>
                        <span className="text-xs text-gray-600">Total Score Trend</span>
                    </div>
                    {visibleHabits.filter(h => !h.archived).slice(0, habitColors.length).map((habit, index) => (
                        <div key={habit.id} className="flex items-center mr-3">
                            <div className="w-3 h-0.5 rounded-full mr-1" style={{ backgroundColor: habitColors[index % habitColors.length], height: '3px' }}></div>
                            <span className="text-xs text-gray-600">{habit.name}</span>
                        </div>
                    ))}
                </div>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-3">Potential Insights</h2>
                {trendTips.length > 0 ? (
                    <ul className="list-disc list-inside space-y-2 text-sm text-gray-600">
                        {trendTips.map((tip, index) => (
                            <li key={index}>{tip}</li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-sm text-gray-500">Track more habits or log more days to see potential insights here.</p>
                )}
            </div>
        </div>
    );
  };

  const SettingsScreen = () => {
    const [newGroupName, setNewGroupName] = useState('');

    const handleAddGroup = (e) => {
        e.preventDefault();
        if (newGroupName.trim() && !groups.includes(newGroupName.trim())) {
            setGroups(prevGroups => [...prevGroups, newGroupName.trim()].sort());
            setNewGroupName('');
        } else if (groups.includes(newGroupName.trim())) {
            alert("This group name already exists.");
        }
    };

    const handleDeleteGroup = (groupNameToDelete) => {
        if (groupNameToDelete === 'Uncategorized') {
            alert("'Uncategorized' group cannot be deleted.");
            return;
        }
        if (habits.some(h => h.group === groupNameToDelete)) {
            if (!window.confirm(`Group "${groupNameToDelete}" is used by some habits. Deleting it will move these habits to 'Uncategorized'. Continue?`)) {
                return;
            }
            // Reassign habits to 'Uncategorized'
            setHabits(prevHabits => prevHabits.map(h => {
                if (h.group === groupNameToDelete) {
                    return { ...h, group: 'Uncategorized' };
                }
                return h;
            }));
        }
        setGroups(prevGroups => prevGroups.filter(g => g !== groupNameToDelete));
    };
    
    const exportData = () => {
        const data = {
            habits,
            entries,
            groups,
            version: "2.0" // For future compatibility checks
        };
        const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(JSON.stringify(data, null, 2))}`;
        const link = document.createElement("a");
        link.href = jsonString;
        link.download = `habit_tracker_backup_${new Date().toISOString().split('T')[0]}.json`;
        link.click();
    };

    const importData = (event) => {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const importedData = JSON.parse(e.target.result);
                    if (importedData.habits && importedData.entries && importedData.groups) {
                        if (window.confirm("Importing data will overwrite current data. Are you sure?")) {
                            // Basic validation/migration if needed from older versions
                            const importedHabits = (importedData.habits || []).map((h, index) => ({
                                ...h,
                                group: h.group || 'Uncategorized',
                                order: h.order !== undefined ? h.order : index,
                                archived: h.archived || false,
                                // Remove goal/unit if they exist in old data
                                dailyGoal: undefined, 
                                unit: undefined
                            }));
                             const importedEntries = {};
                             Object.entries(importedData.entries || {}).forEach(([date, dailyEntries]) => {
                                importedEntries[date] = {};
                                Object.entries(dailyEntries).forEach(([habitId, entry]) => {
                                    importedEntries[date][habitId] = {
                                        score: entry.score || 0,
                                        note: entry.note || ''
                                        // value is removed
                                    };
                                });
                            });

                            setHabits(importedHabits);
                            setEntries(importedEntries);
                            setGroups(importedData.groups.includes('Uncategorized') ? importedData.groups : [...importedData.groups, 'Uncategorized'].sort());
                            alert("Data imported successfully!");
                        }
                    } else {
                        alert("Invalid data file format. Make sure it's a valid JSON backup from this app.");
                    }
                } catch (error) {
                    console.error("Import error:", error);
                    alert("Error importing data: " + error.message);
                }
            };
            reader.readAsText(file);
            event.target.value = null; // Reset file input
        }
    };

    return (
        <div className="p-4 space-y-6">
            <h1 className="text-3xl font-bold text-purple-600">Settings</h1>
            
            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Manage Habit Groups</h2>
                <form onSubmit={handleAddGroup} className="flex items-center space-x-2 mb-4">
                    <input 
                        type="text"
                        value={newGroupName}
                        onChange={(e) => setNewGroupName(e.target.value)}
                        placeholder="New group name"
                        className="flex-grow px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                    />
                    <button type="submit" className="bg-indigo-500 hover:bg-indigo-600 text-white font-semibold py-2 px-3 rounded-lg shadow-md flex items-center transition duration-150">
                        <PlusCircle size={18} className="mr-1" /> Add
                    </button>
                </form>
                <ul className="space-y-2">
                    {groups.map(group => (
                        <li key={group} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                            <span className="text-gray-700">{group}</span>
                            {group !== 'Uncategorized' && (
                                <button 
                                    onClick={() => handleDeleteGroup(group)} 
                                    className="text-red-500 hover:text-red-700"
                                    title="Delete group"
                                >
                                    <Trash2 size={16} />
                                </button>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <div className="bg-white p-6 rounded-lg shadow-lg">
                <h2 className="text-xl font-semibold text-gray-700 mb-4">Data Management</h2>
                 <div className="space-y-3">
                    <button 
                        onClick={exportData}
                        className="w-full bg-blue-500 hover:bg-blue-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center justify-center transition duration-150"
                    >
                        Export Data (JSON)
                    </button>
                    <div>
                        <label 
                            htmlFor="importFile"
                            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md flex items-center justify-center transition duration-150 cursor-pointer"
                        >
                            Import Data (JSON)
                        </label>
                        <input 
                            type="file" 
                            id="importFile"
                            accept=".json"
                            onChange={importData}
                            className="hidden"
                        />
                    </div>
                </div>
                 <p className="text-xs text-gray-500 mt-4">Backups include habits, entries, and groups. Importing will overwrite existing data.</p>
            </div>
        </div>
    );
  };


  return (
    <div className="min-h-screen bg-gray-100 font-inter">
      <nav className="bg-white shadow-md sticky top-0 z-30">
        <div className="max-w-7xl mx-auto px-2 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <ListChecks size={28} smSize={32} className="text-indigo-600" />
              <span className="ml-2 sm:ml-3 font-bold text-lg sm:text-xl text-gray-800">Habit Tracker</span>
            </div>
            <div className="flex space-x-1 sm:space-x-2">
              <NavButton icon={<CalendarDays size={18} smSize={20}/>} label="Log" screenName="log" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
              <NavButton icon={<TrendingUp size={18} smSize={20}/>} label="Dashboard" screenName="dashboard" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
              <NavButton icon={<Settings size={18} smSize={20}/>} label="Settings" screenName="settings" currentScreen={currentScreen} setCurrentScreen={setCurrentScreen} />
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-2 sm:px-6 lg:px-8">
        {currentScreen === 'log' && <HabitLogScreen />}
        {currentScreen === 'dashboard' && <DashboardScreen />}
        {currentScreen === 'settings' && <SettingsScreen />}
      </main>
      <footer className="text-center py-4 text-sm text-gray-500 border-t border-gray-200 mt-8">
        Habit Tracker App &copy; {new Date().getFullYear()}
      </footer>
    </div>
  );
};

const NavButton = ({ icon, label, screenName, currentScreen, setCurrentScreen }) => (
  <button
    onClick={() => setCurrentScreen(screenName)}
    className={`flex flex-col sm:flex-row items-center px-1.5 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium transition-colors duration-150
                ${currentScreen === screenName 
                    ? 'bg-indigo-100 text-indigo-700' 
                    : 'text-gray-600 hover:bg-gray-200 hover:text-gray-800'
                }`}
  >
    {React.cloneElement(icon, { className: "w-4 h-4 sm:w-5 sm:h-5"})}
    <span className="mt-0.5 sm:mt-0 sm:ml-1.5">{label}</span>
  </button>
);

export default App;

