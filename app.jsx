const { useEffect, useMemo, useState } = React;

const TEAM_MEMBERS = ["A", "B", "C", "D"];

const today = new Date();

function isoDate(year, month, day) {
  return new Date(year, month, day).toISOString().slice(0, 10);
}

const MOCK_TASKS = [];

const emptyForm = (defaultOwner = TEAM_MEMBERS[0]) => ({
  owner: defaultOwner,
  title: "",
  description: "",
  visibility: "team",
  taskType: "project",
  ownershipType: "individual",
  startDate: new Date().toISOString().slice(0, 10),
  deadlineType: "has-deadline",
  deadline: "",
  reportTo: "",
  coordinateWith: "",
  priority: "medium",
  status: "not-started",
  recurrence: "weekly",
  notes: "",
  checklistText: ""
});

const priorityClasses = {
  high: "bg-red-100 text-red-700 ring-red-200",
  medium: "bg-amber-100 text-amber-700 ring-amber-200",
  low: "bg-emerald-100 text-emerald-700 ring-emerald-200"
};

const statusClasses = {
  "not-started": "bg-slate-200 text-slate-700",
  "in-progress": "bg-blue-100 text-blue-700",
  completed: "bg-emerald-100 text-emerald-700",
  "on-hold": "bg-rose-100 text-rose-700"
};

function App() {
  const [selectedUser, setSelectedUser] = useState("A");
  const [scope, setScope] = useState("mine");
  const [filters, setFilters] = useState({
    teamMember: "all",
    priority: "all",
    taskType: "all",
    ownershipType: "all",
    status: "all",
    visibility: "all",
    dateRange: "month",
    search: ""
  });
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [form, setForm] = useState(emptyForm("A"));
  const [calendarDate, setCalendarDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1));

  useEffect(() => {
    setForm((current) => ({ ...current, owner: selectedUser }));
  }, [selectedUser]);

  const visibleTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchesScope =
        scope === "all"
          ? true
          : scope === "mine"
            ? task.owner === selectedUser
            : scope === "team"
              ? task.visibility === "team"
              : task.ownershipType === "group";

      const matchesSelectedUser =
        filters.teamMember === "all" ? true : task.owner === filters.teamMember;
      const matchesPriority = filters.priority === "all" ? true : task.priority === filters.priority;
      const matchesType = filters.taskType === "all" ? true : task.taskType === filters.taskType;
      const matchesOwnership =
        filters.ownershipType === "all" ? true : task.ownershipType === filters.ownershipType;
      const matchesStatus = filters.status === "all" ? true : task.status === filters.status;
      const matchesVisibility =
        filters.visibility === "all" ? true : task.visibility === filters.visibility;
      const matchesSearch =
        !filters.search ||
        [task.title, task.description, task.coordinateWith, task.reportTo, task.notes]
          .join(" ")
          .toLowerCase()
          .includes(filters.search.toLowerCase());
      const matchesDateRange = filterByDateRange(task, filters.dateRange, calendarDate);

      if (task.visibility === "private" && task.owner !== selectedUser) {
        return false;
      }

      return (
        matchesScope &&
        matchesSelectedUser &&
        matchesPriority &&
        matchesType &&
        matchesOwnership &&
        matchesStatus &&
        matchesVisibility &&
        matchesSearch &&
        matchesDateRange
      );
    });
  }, [tasks, scope, filters, selectedUser, calendarDate]);

  const selectedTask =
    visibleTasks.find((task) => task.id === selectedTaskId) || visibleTasks[0] || null;

  useEffect(() => {
    if (selectedTask) {
      setSelectedTaskId(selectedTask.id);
    }
  }, [selectedTask?.id]);

  const calendarCells = useMemo(() => buildCalendar(calendarDate), [calendarDate]);

  const metrics = useMemo(() => {
    const highPriority = visibleTasks.filter((task) => task.priority === "high").length;
    const shared = visibleTasks.filter((task) => task.ownershipType === "group").length;
    const dueSoon = visibleTasks.filter((task) => {
      if (!task.deadline) return false;
      const diff = daysBetween(new Date(), new Date(task.deadline));
      return diff >= 0 && diff <= 7;
    }).length;

    return { total: visibleTasks.length, highPriority, shared, dueSoon };
  }, [visibleTasks]);

  function handleChecklistToggle(taskId, itemId) {
    setTasks((current) =>
      current.map((task) =>
        task.id !== taskId
          ? task
          : {
              ...task,
              checklist: task.checklist.map((item) =>
                item.id === itemId ? { ...item, done: !item.done } : item
              )
            }
      )
    );
  }

  function handleFormSubmit(event) {
    event.preventDefault();
    const checklist = form.checklistText
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((text, index) => ({
        id: `new-${Date.now()}-${index}`,
        text,
        done: false
      }));

    const newTask = {
      id: `task-${Date.now()}`,
      title: form.title,
      description: form.description,
      owner: form.owner,
      visibility: form.visibility,
      taskType: form.taskType,
      ownershipType: form.ownershipType,
      startDate: form.startDate,
      deadlineType: form.deadlineType,
      deadline: form.deadlineType === "has-deadline" ? form.deadline : "",
      reportTo: form.reportTo,
      coordinateWith: form.coordinateWith,
      priority: form.priority,
      status: form.status,
      recurrence: form.taskType === "recurring" ? form.recurrence : "",
      notes: form.notes,
      checklist
    };

    setTasks((current) => [newTask, ...current]);
    setSelectedTaskId(newTask.id);
    setForm(emptyForm(selectedUser));
    setIsFormOpen(false);
  }

  return (
    <div className="min-h-screen bg-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-6 lg:px-6">
        <section className="grid gap-6 xl:grid-cols-[260px_minmax(0,1fr)_320px]">
          <TopBar
            selectedUser={selectedUser}
            setSelectedUser={setSelectedUser}
            scope={scope}
            setScope={setScope}
            filters={filters}
            setFilters={setFilters}
            onAddTask={() => setIsFormOpen(true)}
          />

          <div className="rounded-3xl bg-white p-5 shadow-panel ring-1 ring-slate-200">
            <div className="mb-5 flex flex-col gap-4 border-b border-slate-200 pb-5 xl:flex-row xl:items-end xl:justify-between">
              <div>
                <p className="text-sm font-semibold uppercase tracking-[0.24em] text-sky-700">
                  Team Task Dashboard
                </p>
                <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-950">
                  Monthly task calendar
                </h1>
                <p className="mt-2 max-w-3xl text-sm text-slate-500">
                  Calendar first, with task ranges visible across dates and details on the right.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <MetricCard label="Visible tasks" value={metrics.total} />
                <MetricCard label="High priority" value={metrics.highPriority} />
                <MetricCard label="Shared tasks" value={metrics.shared} />
                <MetricCard label="Due in 7 days" value={metrics.dueSoon} />
              </div>
            </div>

            <CalendarToolbar
              calendarDate={calendarDate}
              onPrev={() =>
                setCalendarDate(
                  (current) => new Date(current.getFullYear(), current.getMonth() - 1, 1)
                )
              }
              onNext={() =>
                setCalendarDate(
                  (current) => new Date(current.getFullYear(), current.getMonth() + 1, 1)
                )
              }
            />
            <CalendarGrid
              cells={calendarCells}
              tasks={visibleTasks}
              onSelectTask={setSelectedTaskId}
              selectedTaskId={selectedTaskId}
            />
          </div>

          <div className="flex flex-col gap-4">
            <Legend compact />
            <TaskDetailPanel
              task={selectedTask}
              onChecklistToggle={handleChecklistToggle}
            />
          </div>
        </section>

        <TaskTable
          tasks={visibleTasks}
          selectedTaskId={selectedTaskId}
          onSelectTask={setSelectedTaskId}
          onChecklistToggle={handleChecklistToggle}
        />
      </div>

      {isFormOpen ? (
        <TaskFormModal
          form={form}
          setForm={setForm}
          onClose={() => setIsFormOpen(false)}
          onSubmit={handleFormSubmit}
        />
      ) : null}
    </div>
  );
}

function TopBar({
  selectedUser,
  setSelectedUser,
  scope,
  setScope,
  filters,
  setFilters,
  onAddTask
}) {
  const scopes = [
    { id: "mine", label: "My tasks only" },
    { id: "team", label: "Team tasks" },
    { id: "shared", label: "Shared/group tasks" },
    { id: "all", label: "All tasks" }
  ];

  return (
    <aside className="rounded-3xl bg-slatebrand-950 p-4 text-white shadow-panel xl:sticky xl:top-6 xl:h-fit">
      <div className="flex flex-col gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-sky-300">
            Controls
          </p>
          <h2 className="mt-2 text-lg font-semibold">
            Filters and user view
          </h2>
        </div>

        <label className="flex flex-col gap-2 text-sm">
          <span className="text-slate-300">Current user</span>
          <select
            className="rounded-2xl border border-white/10 bg-slate-900 px-3 py-2 text-sm"
            value={selectedUser}
            onChange={(event) => setSelectedUser(event.target.value)}
          >
            {TEAM_MEMBERS.map((member) => (
              <option key={member} value={member}>
                {member}
              </option>
            ))}
          </select>
        </label>

        <button
          type="button"
          onClick={onAddTask}
          className="rounded-2xl bg-sky-400 px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:bg-sky-300"
        >
          Add new task
        </button>

        <input
          type="text"
          value={filters.search}
          onChange={(event) =>
            setFilters((current) => ({ ...current, search: event.target.value }))
          }
          placeholder="Search task or keyword"
          className="w-full rounded-2xl border border-white/10 bg-white/10 px-3 py-2.5 text-sm text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-300"
        />

        <div className="flex flex-wrap gap-2">
          {scopes.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setScope(option.id)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium transition ${
                scope === option.id
                  ? "bg-white text-slate-950"
                  : "bg-white/10 text-slate-200 hover:bg-white/15"
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3">
          <FilterSelect
            label="Team member"
            value={filters.teamMember}
            onChange={(value) => setFilters((current) => ({ ...current, teamMember: value }))}
            options={["all", ...TEAM_MEMBERS]}
          />
          <FilterSelect
            label="Priority"
            value={filters.priority}
            onChange={(value) => setFilters((current) => ({ ...current, priority: value }))}
            options={["all", "high", "medium", "low"]}
          />
          <FilterSelect
            label="Task type"
            value={filters.taskType}
            onChange={(value) => setFilters((current) => ({ ...current, taskType: value }))}
            options={["all", "recurring", "project"]}
          />
          <FilterSelect
            label="Ownership"
            value={filters.ownershipType}
            onChange={(value) =>
              setFilters((current) => ({ ...current, ownershipType: value }))
            }
            options={["all", "individual", "group"]}
          />
          <FilterSelect
            label="Status"
            value={filters.status}
            onChange={(value) => setFilters((current) => ({ ...current, status: value }))}
            options={["all", "not-started", "in-progress", "completed", "on-hold"]}
          />
          <FilterSelect
            label="Visibility"
            value={filters.visibility}
            onChange={(value) => setFilters((current) => ({ ...current, visibility: value }))}
            options={["all", "team", "private"]}
          />
          <FilterSelect
            label="Date range"
            value={filters.dateRange}
            onChange={(value) => setFilters((current) => ({ ...current, dateRange: value }))}
            options={["month", "next-30", "next-90", "all-time"]}
          />
        </div>
      </div>
    </aside>
  );
}

function FilterSelect({ label, value, onChange, options }) {
  return (
    <label className="flex flex-col gap-2 text-sm">
      <span className="text-slate-300">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="rounded-2xl border border-white/10 bg-white/10 px-3 py-3 text-white outline-none focus:ring-2 focus:ring-sky-300"
      >
        {options.map((option) => (
          <option key={option} value={option} className="text-slate-900">
            {formatOption(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-3 py-3 ring-1 ring-slate-200">
      <div className="text-2xl font-semibold leading-none text-slate-950">{value}</div>
      <div className="mt-2 text-[10px] uppercase tracking-[0.18em] text-slate-500">
        {label}
      </div>
    </div>
  );
}

function Legend({ compact = false }) {
  return (
    <div className={`rounded-3xl bg-white p-4 shadow-panel ring-1 ring-slate-200 ${compact ? "" : "mb-5"}`}>
      <div>
        <h3 className="text-sm font-semibold text-slate-800">Visual legend</h3>
        <p className="text-sm text-slate-500">
          Color = priority. Shape = recurring or project. Badge = ownership.
        </p>
      </div>

      <div className="mt-3 flex flex-wrap gap-2 text-xs">
        <LegendPill className="bg-red-100 text-red-700">High</LegendPill>
        <LegendPill className="bg-amber-100 text-amber-700">Medium</LegendPill>
        <LegendPill className="bg-emerald-100 text-emerald-700">Low</LegendPill>
        <LegendPill className="bg-slate-900 text-white">● Recurring</LegendPill>
        <LegendPill className="bg-slate-200 text-slate-800">■ Project</LegendPill>
        <LegendPill className="bg-sky-100 text-sky-700">Shared</LegendPill>
        <LegendPill className="bg-slate-100 text-slate-700">Individual</LegendPill>
      </div>
    </div>
  );
}

function LegendPill({ className, children }) {
  return (
    <span className={`rounded-full px-3 py-2 font-medium ring-1 ring-inset ring-black/5 ${className}`}>
      {children}
    </span>
  );
}

function CalendarToolbar({ calendarDate, onPrev, onNext }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <div>
        <h3 className="text-xl font-semibold text-slate-900">
          {calendarDate.toLocaleDateString("en-US", {
            month: "long",
            year: "numeric"
          })}
        </h3>
        <p className="text-sm text-slate-500">
          Click any task chip to open full details on the right.
        </p>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={onPrev}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Previous
        </button>
        <button
          type="button"
          onClick={onNext}
          className="rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function CalendarGrid({ cells, tasks, onSelectTask, selectedTaskId }) {
  const tasksByDate = useMemo(() => groupTasksByDate(tasks, cells), [tasks, cells]);
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  return (
    <div className="overflow-hidden rounded-3xl border border-slate-200">
      <div className="grid grid-cols-7 bg-slate-900 text-center text-xs font-semibold uppercase tracking-[0.2em] text-slate-300">
        {weekdays.map((day) => (
          <div key={day} className="px-2 py-3">
            {day}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 bg-white">
        {cells.map((cell) => {
          const iso = cell.date.toISOString().slice(0, 10);
          const dayTasks = tasksByDate.get(iso) || [];
          const isToday = iso === new Date().toISOString().slice(0, 10);

          return (
            <div
              key={iso}
              className={`min-h-[150px] border-b border-r border-slate-200 p-2 align-top ${
                cell.isCurrentMonth ? "bg-white" : "bg-slate-50"
              }`}
            >
              <div className="mb-2 flex items-center justify-between">
                <span
                  className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-sm font-semibold ${
                    isToday ? "bg-sky-600 text-white" : "text-slate-700"
                  }`}
                >
                  {cell.date.getDate()}
                </span>
                <span className="text-xs text-slate-400">{dayTasks.length || ""}</span>
              </div>

              <div className="space-y-1.5">
                {dayTasks.slice(0, 4).map((task) => (
                  <button
                    key={task.id}
                    type="button"
                    onClick={() => onSelectTask(task.id)}
                    className={`flex w-full items-start gap-2 rounded-xl px-2 py-1.5 text-left text-[11px] ring-1 transition hover:shadow-sm ${
                      selectedTaskId === task.id
                        ? "ring-sky-400"
                        : "ring-transparent hover:ring-slate-200"
                    } ${chipClass(task.priority)}`}
                  >
                    <span className="pt-0.5 text-[10px]">
                      {task.taskType === "recurring" ? "●" : "■"}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block whitespace-normal break-words font-semibold leading-4">
                        {task.title}
                      </span>
                      <span className="mt-0.5 block whitespace-normal break-words opacity-80 leading-4">
                        {task.owner} {task.ownershipType === "group" ? "• shared" : ""}
                      </span>
                    </span>
                  </button>
                ))}

                {dayTasks.length > 4 ? (
                  <div className="px-2 text-xs font-medium text-slate-500">
                    +{dayTasks.length - 4} more
                  </div>
                ) : null}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function TaskDetailPanel({ task, onChecklistToggle }) {
  if (!task) {
    return (
      <aside className="rounded-3xl bg-white p-5 shadow-panel ring-1 ring-slate-200">
        <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
          Task details
        </p>
        <p className="mt-4 text-sm text-slate-500">
          No tasks yet. Add your first task from the left panel, then click it in the
          calendar to inspect details and checklist progress.
        </p>
      </aside>
    );
  }

  const { doneCount, totalCount, percentage } = getChecklistStats(task.checklist);

  return (
    <aside className="sticky top-6 h-fit rounded-3xl bg-white p-5 shadow-panel ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Task details
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">{task.title}</h3>
        </div>
        <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[task.status]}`}>
          {formatOption(task.status)}
        </span>
      </div>

      <p className="mt-4 text-sm leading-6 text-slate-600">{task.description}</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <span className={`rounded-full px-3 py-2 text-xs font-semibold ring-1 ${priorityClasses[task.priority]}`}>
          {formatOption(task.priority)} priority
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          {task.taskType === "recurring" ? "Recurring" : "Project-based"}
        </span>
        <span className="rounded-full bg-sky-100 px-3 py-2 text-xs font-semibold text-sky-700">
          {task.ownershipType === "group" ? "Shared / group" : "Individual"}
        </span>
        <span className="rounded-full bg-slate-100 px-3 py-2 text-xs font-semibold text-slate-700">
          {task.visibility === "private" ? "Private" : "Team visible"}
        </span>
      </div>

      <dl className="mt-6 grid grid-cols-1 gap-4 text-sm">
        <DetailRow label="Owner" value={task.owner} />
        <DetailRow label="Start date" value={formatDate(task.startDate)} />
        <DetailRow
          label="Deadline"
          value={
            task.deadlineType === "has-deadline"
              ? formatDate(task.deadline)
              : task.deadlineType === "deadline-tbd"
                ? "TBD"
                : "No deadline"
          }
        />
        <DetailRow label="Who to report to" value={task.reportTo || "Not set"} />
        <DetailRow
          label="Coordinate with"
          value={task.coordinateWith || "No coordination listed"}
        />
        <DetailRow
          label="Notes / comments"
          value={task.notes || "No notes captured"}
          multiline
        />
      </dl>

      <div className="mt-6">
        <div className="mb-2 flex items-center justify-between text-sm">
          <span className="font-semibold text-slate-800">Checklist progress</span>
          <span className="text-slate-500">
            {doneCount}/{totalCount} completed
          </span>
        </div>
        <div className="h-2 rounded-full bg-slate-200">
          <div
            className="h-2 rounded-full bg-sky-600 transition-all"
            style={{ width: `${percentage}%` }}
          />
        </div>
        <div className="mt-4 space-y-2">
          {task.checklist.map((item) => (
            <label
              key={item.id}
              className="flex items-start gap-3 rounded-2xl border border-slate-200 px-3 py-3"
            >
              <input
                type="checkbox"
                checked={item.done}
                onChange={() => onChecklistToggle(task.id, item.id)}
                className="mt-1 h-4 w-4 rounded border-slate-300 text-sky-600 focus:ring-sky-500"
              />
              <span className={`text-sm ${item.done ? "text-slate-400 line-through" : "text-slate-700"}`}>
                {item.text}
              </span>
            </label>
          ))}
        </div>
      </div>
    </aside>
  );
}

function DetailRow({ label, value, multiline = false }) {
  return (
    <div className="rounded-2xl bg-slate-50 px-4 py-3">
      <dt className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
        {label}
      </dt>
      <dd className={`mt-1 text-sm text-slate-800 ${multiline ? "leading-6" : ""}`}>{value}</dd>
    </div>
  );
}

function TaskTable({ tasks, selectedTaskId, onSelectTask, onChecklistToggle }) {
  return (
    <section className="rounded-3xl bg-white p-5 shadow-panel ring-1 ring-slate-200">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
            Progress tracking
          </p>
          <h3 className="mt-2 text-2xl font-semibold text-slate-950">Task list view</h3>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-xs uppercase tracking-[0.2em] text-slate-500">
              <th className="px-3">Task</th>
              <th className="px-3">Owner</th>
              <th className="px-3">Priority</th>
              <th className="px-3">Deadline</th>
              <th className="px-3">Status</th>
              <th className="px-3">Progress</th>
              <th className="px-3">Checklist</th>
            </tr>
          </thead>
          <tbody>
            {tasks.map((task) => {
              const stats = getChecklistStats(task.checklist);
              return (
                <tr
                  key={task.id}
                  onClick={() => onSelectTask(task.id)}
                  className={`cursor-pointer rounded-2xl bg-slate-50 transition hover:bg-slate-100 ${
                    selectedTaskId === task.id ? "ring-2 ring-sky-300" : ""
                  }`}
                >
                  <td className="rounded-l-2xl px-3 py-4">
                    <div className="font-semibold text-slate-900">{task.title}</div>
                    <div className="mt-1 text-sm text-slate-500">
                      {task.taskType === "recurring" ? "Recurring" : "Project"} •{" "}
                      {task.ownershipType === "group" ? "Shared" : "Individual"}
                    </div>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-700">{task.owner}</td>
                  <td className="px-3 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ring-1 ${priorityClasses[task.priority]}`}>
                      {formatOption(task.priority)}
                    </span>
                  </td>
                  <td className="px-3 py-4 text-sm text-slate-700">
                    {task.deadline
                      ? formatDate(task.deadline)
                      : task.deadlineType === "deadline-tbd"
                        ? "TBD"
                        : "No deadline"}
                  </td>
                  <td className="px-3 py-4">
                    <span className={`rounded-full px-3 py-1 text-xs font-semibold ${statusClasses[task.status]}`}>
                      {formatOption(task.status)}
                    </span>
                  </td>
                  <td className="px-3 py-4">
                    <div className="w-40">
                      <div className="mb-1 flex items-center justify-between text-xs text-slate-500">
                        <span>{stats.percentage}%</span>
                        <span>{stats.doneCount}/{stats.totalCount}</span>
                      </div>
                      <div className="h-2 rounded-full bg-slate-200">
                        <div
                          className="h-2 rounded-full bg-sky-600"
                          style={{ width: `${stats.percentage}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="rounded-r-2xl px-3 py-4 text-sm text-slate-700">
                    <div className="max-h-28 space-y-2 overflow-y-auto pr-1">
                      {task.checklist.map((item) => (
                        <label
                          key={item.id}
                          className="flex items-start gap-2 rounded-2xl bg-white px-3 py-2"
                          onClick={(event) => event.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={item.done}
                            onChange={() => onChecklistToggle(task.id, item.id)}
                            className="mt-0.5"
                          />
                          <span className="text-xs leading-5 break-words">{item.text}</span>
                        </label>
                      ))}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function TaskFormModal({ form, setForm, onClose, onSubmit }) {
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/55 px-4 py-8">
      <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-panel ring-1 ring-slate-200">
        <div className="mb-5 flex items-start justify-between">
          <div>
            <p className="text-sm font-semibold uppercase tracking-[0.24em] text-slate-500">
              Create task
            </p>
            <h3 className="mt-2 text-2xl font-semibold text-slate-950">
              Add a new task for the team dashboard
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-2xl border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          >
            Close
          </button>
        </div>

        <form onSubmit={onSubmit} className="grid gap-4 md:grid-cols-2">
          <InputField
            label="User / owner name"
            element={
              <select
                value={form.owner}
                onChange={(event) => setForm({ ...form, owner: event.target.value })}
                className={fieldClass}
              >
                {TEAM_MEMBERS.map((member) => (
                  <option key={member} value={member}>
                    {member}
                  </option>
                ))}
              </select>
            }
          />
          <InputField
            label="Task title"
            element={
              <input
                className={fieldClass}
                value={form.title}
                onChange={(event) => setForm({ ...form, title: event.target.value })}
                required
              />
            }
          />

          <InputField
            label="Visibility"
            element={
              <select
                value={form.visibility}
                onChange={(event) => setForm({ ...form, visibility: event.target.value })}
                className={fieldClass}
              >
                <option value="team">Team visible</option>
                <option value="private">Private</option>
              </select>
            }
          />
          <InputField
            label="Task type"
            element={
              <select
                value={form.taskType}
                onChange={(event) => setForm({ ...form, taskType: event.target.value })}
                className={fieldClass}
              >
                <option value="recurring">Recurring</option>
                <option value="project">Project-based</option>
              </select>
            }
          />

          <InputField
            label="Ownership type"
            element={
              <select
                value={form.ownershipType}
                onChange={(event) => setForm({ ...form, ownershipType: event.target.value })}
                className={fieldClass}
              >
                <option value="individual">Individual</option>
                <option value="group">Group</option>
              </select>
            }
          />
          <InputField
            label="Start date"
            element={
              <input
                type="date"
                className={fieldClass}
                value={form.startDate}
                onChange={(event) => setForm({ ...form, startDate: event.target.value })}
              />
            }
          />

          <InputField
            label="Deadline setting"
            element={
              <select
                value={form.deadlineType}
                onChange={(event) => setForm({ ...form, deadlineType: event.target.value })}
                className={fieldClass}
              >
                <option value="has-deadline">Has deadline</option>
                <option value="no-deadline">No deadline</option>
                <option value="deadline-tbd">Deadline TBD</option>
              </select>
            }
          />
          <InputField
            label="Deadline"
            element={
              <input
                type="date"
                className={fieldClass}
                value={form.deadline}
                onChange={(event) => setForm({ ...form, deadline: event.target.value })}
                disabled={form.deadlineType !== "has-deadline"}
              />
            }
          />

          <InputField
            label="Who to report to"
            element={
              <input
                className={fieldClass}
                value={form.reportTo}
                onChange={(event) => setForm({ ...form, reportTo: event.target.value })}
              />
            }
          />
          <InputField
            label="Team / person to coordinate with"
            element={
              <input
                className={fieldClass}
                value={form.coordinateWith}
                onChange={(event) => setForm({ ...form, coordinateWith: event.target.value })}
              />
            }
          />

          <InputField
            label="Priority"
            element={
              <select
                value={form.priority}
                onChange={(event) => setForm({ ...form, priority: event.target.value })}
                className={fieldClass}
              >
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            }
          />
          <InputField
            label="Status"
            element={
              <select
                value={form.status}
                onChange={(event) => setForm({ ...form, status: event.target.value })}
                className={fieldClass}
              >
                <option value="not-started">Not started</option>
                <option value="in-progress">In progress</option>
                <option value="completed">Completed</option>
                <option value="on-hold">On hold</option>
              </select>
            }
          />

          {form.taskType === "recurring" ? (
            <div className="md:col-span-2">
              <InputField
                label="Recurrence"
                element={
                  <select
                    value={form.recurrence}
                    onChange={(event) => setForm({ ...form, recurrence: event.target.value })}
                    className={fieldClass}
                  >
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                    <option value="custom">Custom</option>
                  </select>
                }
              />
            </div>
          ) : null}

          <div className="md:col-span-2">
            <InputField
              label="Task description"
              element={
                <textarea
                  rows="4"
                  className={fieldClass}
                  value={form.description}
                  onChange={(event) => setForm({ ...form, description: event.target.value })}
                />
              }
            />
          </div>

          <div className="md:col-span-2">
            <InputField
              label="Notes / comments"
              element={
                <textarea
                  rows="3"
                  className={fieldClass}
                  value={form.notes}
                  onChange={(event) => setForm({ ...form, notes: event.target.value })}
                />
              }
            />
          </div>

          <div className="md:col-span-2">
            <InputField
              label="Checklist items / milestones (one per line)"
              element={
                <textarea
                  rows="5"
                  className={fieldClass}
                  value={form.checklistText}
                  onChange={(event) => setForm({ ...form, checklistText: event.target.value })}
                  placeholder={"Collect inputs\nDraft summary\nReview with lead"}
                />
              }
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-2xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="rounded-2xl bg-slate-950 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-800"
            >
              Save task
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function InputField({ label, element }) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-slate-700">
      <span>{label}</span>
      {element}
    </label>
  );
}

const fieldClass =
  "w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:ring-2 focus:ring-sky-400";

function filterByDateRange(task, dateRange, calendarDate) {
  if (dateRange === "all-time") return true;

  const start = new Date(calendarDate.getFullYear(), calendarDate.getMonth(), 1);
  const end =
    dateRange === "month"
      ? new Date(calendarDate.getFullYear(), calendarDate.getMonth() + 1, 0)
      : new Date(start.getFullYear(), start.getMonth(), start.getDate() + (dateRange === "next-30" ? 30 : 90));

  const taskDate = new Date(task.deadline || task.startDate);
  return taskDate >= start && taskDate <= end;
}

function buildCalendar(baseDate) {
  const firstDay = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const startDay = new Date(firstDay);
  startDay.setDate(firstDay.getDate() - firstDay.getDay());

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDay);
    date.setDate(startDay.getDate() + index);
    return {
      date,
      isCurrentMonth: date.getMonth() === baseDate.getMonth()
    };
  });
}

function groupTasksByDate(tasks, cells) {
  const grouped = new Map();
  if (!cells.length) return grouped;

  const rangeStart = cells[0].date;
  const rangeEnd = cells[cells.length - 1].date;

  tasks.forEach((task) => {
    const dates = taskDates(task, rangeStart, rangeEnd);
    dates.forEach((date) => {
      if (!grouped.has(date)) grouped.set(date, []);
      grouped.get(date).push(task);
    });
  });

  return grouped;
}

function taskDates(task, rangeStart, rangeEnd) {
  const dates = new Set();
  const start = new Date(task.startDate);
  const visibleStart = new Date(rangeStart);
  const visibleEnd = new Date(rangeEnd);

  if (task.taskType !== "recurring") {
    const end = task.deadline ? new Date(task.deadline) : new Date(task.startDate);
    const effectiveStart = start > visibleStart ? start : visibleStart;
    const effectiveEnd = end < visibleEnd ? end : visibleEnd;

    if (effectiveEnd >= effectiveStart) {
      for (let d = new Date(effectiveStart); d <= effectiveEnd; d.setDate(d.getDate() + 1)) {
        dates.add(d.toISOString().slice(0, 10));
      }
    } else if (start >= visibleStart && start <= visibleEnd) {
      dates.add(task.startDate);
    }

    return [...dates];
  }

  const recurringEnd = task.deadline ? new Date(task.deadline) : visibleEnd;
  const effectiveRecurringEnd = recurringEnd < visibleEnd ? recurringEnd : visibleEnd;

  if (effectiveRecurringEnd < visibleStart) {
    return [];
  }

  if (task.recurrence === "daily") {
    const firstDay = start > visibleStart ? start : visibleStart;
    for (let d = new Date(firstDay); d <= effectiveRecurringEnd; d.setDate(d.getDate() + 1)) {
      dates.add(d.toISOString().slice(0, 10));
    }
  }

  if (task.recurrence === "weekly") {
    const targetWeekday = start.getDay();
    const firstWeekly = new Date(visibleStart);

    while (firstWeekly.getDay() !== targetWeekday) {
      firstWeekly.setDate(firstWeekly.getDate() + 1);
    }

    if (firstWeekly < start) {
      firstWeekly.setDate(firstWeekly.getDate() + 7);
    }

    for (let d = new Date(firstWeekly); d <= effectiveRecurringEnd; d.setDate(d.getDate() + 7)) {
      dates.add(d.toISOString().slice(0, 10));
    }
  }

  if (task.recurrence === "monthly" || task.recurrence === "custom") {
    const targetDay = start.getDate();
    const cursor = new Date(visibleStart.getFullYear(), visibleStart.getMonth(), targetDay);

    if (cursor < start) {
      cursor.setMonth(cursor.getMonth() + 1);
    }

    while (cursor <= effectiveRecurringEnd) {
      if (cursor >= visibleStart) {
        dates.add(cursor.toISOString().slice(0, 10));
      }
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  if (!dates.size && start >= visibleStart && start <= effectiveRecurringEnd) {
    dates.add(start.toISOString().slice(0, 10));
  }

  return [...dates];
}

function getChecklistStats(checklist) {
  const totalCount = checklist.length || 1;
  const doneCount = checklist.filter((item) => item.done).length;
  const percentage = Math.round((doneCount / totalCount) * 100);
  return { totalCount, doneCount, percentage };
}

function chipClass(priority) {
  if (priority === "high") return "bg-red-50 text-red-700";
  if (priority === "medium") return "bg-amber-50 text-amber-700";
  return "bg-emerald-50 text-emerald-700";
}

function formatOption(value) {
  return value
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value) {
  if (!value) return "Not set";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric"
  });
}

function daysBetween(dateA, dateB) {
  const msPerDay = 1000 * 60 * 60 * 24;
  return Math.round((stripTime(dateB) - stripTime(dateA)) / msPerDay);
}

function stripTime(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime();
}

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
