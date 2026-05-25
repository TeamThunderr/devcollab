import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useProjectStore } from '../../stores/projectStore';

export default function ProjectsPage(): React.ReactElement {
  const { workspaceId } = useParams<{ workspaceId: string }>();
  const { projects, loading, error, fetchProjects, createProject, deleteProject } = useProjectStore();
  const [showForm, setShowForm] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (workspaceId) {
      void fetchProjects(workspaceId);
    }
  }, [fetchProjects, workspaceId]);

  async function handleCreateProject() {
    if (!name.trim()) {
      return;
    }

    setIsSubmitting(true);

    try {
      await createProject({
        name: name.trim(),
        description: description.trim() || undefined,
        workspaceId: workspaceId!,
      });
      setName('');
      setDescription('');
      setShowForm(false);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteProject(projectId: string) {
    if (!window.confirm('Delete this project and all of its tasks and snippets?')) {
      return;
    }

    await deleteProject(projectId);
  }

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-8 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-6xl">
        <div className="mb-8 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-800 to-cyan-800 p-8 text-white shadow-xl sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-sm uppercase tracking-[0.3em] text-cyan-200">Module 2</p>
            <h1 className="mt-2 text-4xl font-semibold tracking-tight">Projects</h1>
            <p className="mt-3 max-w-2xl text-sm text-slate-200">
              Organize delivery streams for workspace <span className="font-semibold">{workspaceId}</span>.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowForm((current) => !current)}
            className="rounded-full bg-white px-5 py-3 text-sm font-semibold text-slate-900 transition hover:bg-cyan-100"
          >
            {showForm ? 'Close Form' : 'New Project'}
          </button>
        </div>

        {showForm ? (
          <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Create Project</h2>
            <div className="mt-4 grid gap-4">
              <input
                type="text"
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Roadmap Alpha"
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
              />
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="What is this project responsible for?"
                rows={4}
                className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-cyan-500"
              />
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => void handleCreateProject()}
                  disabled={isSubmitting || !name.trim()}
                  className="rounded-full bg-cyan-600 px-5 py-3 text-sm font-semibold text-white transition hover:bg-cyan-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isSubmitting ? 'Creating...' : 'Create Project'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowForm(false)}
                  className="rounded-full border border-slate-300 px-5 py-3 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
                >
                  Cancel
                </button>
              </div>
            </div>
          </section>
        ) : null}

        {error ? (
          <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            {error}
          </div>
        ) : null}

        {loading ? (
          <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center text-sm text-slate-500 shadow-sm">
            Loading projects...
          </div>
        ) : projects.length === 0 ? (
          <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-12 text-center shadow-sm">
            <p className="text-lg font-medium text-slate-700">No projects yet</p>
            <p className="mt-2 text-sm text-slate-500">Create the first project for this workspace to start managing tasks and snippets.</p>
          </div>
        ) : (
          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {projects.map((project) => (
              <article
                key={project.id}
                className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.25em] text-cyan-600">Project</p>
                    <h2 className="mt-2 text-2xl font-semibold text-slate-900">{project.name}</h2>
                  </div>
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {new Date(project.createdAt).toLocaleDateString()}
                  </span>
                </div>

                <p className="mt-4 min-h-[3rem] text-sm leading-6 text-slate-600">
                  {project.description || 'No description provided yet.'}
                </p>

                <div className="mt-6 grid grid-cols-2 gap-3">
                  <div className="rounded-2xl bg-slate-100 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-slate-500">Tasks</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{project._count?.tasks ?? 0}</p>
                  </div>
                  <div className="rounded-2xl bg-cyan-50 px-4 py-3">
                    <p className="text-xs uppercase tracking-wide text-cyan-700">Snippets</p>
                    <p className="mt-1 text-xl font-semibold text-slate-900">{project._count?.snippets ?? 0}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <Link
                    to={`/w/${workspaceId}/p/${project.id}/board`}
                    className="rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
                  >
                    Open Board
                  </Link>
                  <Link
                    to={`/w/${workspaceId}/p/${project.id}/editor`}
                    className="rounded-full border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-800 transition hover:bg-indigo-100"
                  >
                    Open Editor
                  </Link>
                  <Link
                    to={`/w/${workspaceId}/p/${project.id}/snippets`}
                    className="rounded-full border border-cyan-200 bg-cyan-50 px-4 py-2 text-sm font-semibold text-cyan-800 transition hover:bg-cyan-100"
                  >
                    Open Snippets
                  </Link>
                  <button
                    type="button"
                    onClick={() => void handleDeleteProject(project.id)}
                    className="rounded-full border border-rose-200 px-4 py-2 text-sm font-semibold text-rose-700 transition hover:bg-rose-50"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
