import React, { useState, useEffect, Component, ErrorInfo, ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import useAuthStore from '../../stores/authStore';
import LoadingSpinner from '../../components/ui/LoadingSpinner';
import { User, Mail, Code, AlignLeft, Camera, Check, ArrowLeft } from 'lucide-react';

const GithubIcon = ({ className }: { className?: string }) => (
  <svg className={className} fill="currentColor" viewBox="0 0 24 24" aria-hidden="true">
    <path fillRule="evenodd" d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z" clipRule="evenodd" />
  </svg>
);

class ErrorBoundary extends Component<{children: ReactNode}, {hasError: boolean, error: Error | null}> {
  state = { hasError: false, error: null };
  static getDerivedStateFromError(error: Error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return <div className="p-10 text-red-600"><h1 className="text-2xl font-bold">React Crashed</h1><pre className="mt-4">{String(this.state.error?.stack)}</pre></div>;
    }
    return this.props.children;
  }
}

export default function ProfilePage(): React.ReactElement {
  const navigate = useNavigate();
  const { user, updateProfile, isLoading, error } = useAuthStore();
  
  const [isEditing, setIsEditing] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  
  const [formData, setFormData] = useState({
    name: '',
    avatar_url: '',
    bio: '',
    skillsStr: '',
    github_url: '',
  });

  useEffect(() => {
    if (user) {
      setFormData({
        name: user.name || '',
        avatar_url: user.avatar || '',
        bio: user.bio || '',
        skillsStr: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        github_url: user.githubLink || '',
      });
    }
  }, [user]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg('');
    
    // Process skills from comma separated string
    const skills = formData.skillsStr
      .split(',')
      .map(s => s.trim())
      .filter(s => s.length > 0);

    try {
      await updateProfile({
        name: formData.name,
        avatar: formData.avatar_url,
        bio: formData.bio,
        skills,
        githubLink: formData.github_url,
      });
      setIsEditing(false);
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      // Error is handled by store and displayed below
    }
  };

  const handleCancel = () => {
    if (user) {
      setFormData({
        name: user.name || '',
        avatar_url: user.avatar || '',
        bio: user.bio || '',
        skillsStr: Array.isArray(user.skills) ? user.skills.join(', ') : '',
        github_url: user.githubLink || '',
      });
    }
    setIsEditing(false);
    useAuthStore.setState({ error: null });
  };

  if (!user) {
    return (
      <div className="flex h-full items-center justify-center">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  const userInitials = user.name
    ? user.name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : user.email.substring(0, 2).toUpperCase();

  return (
    <ErrorBoundary>
      <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
        <div className="mb-6">
          <button 
            onClick={() => navigate(-1)} 
            className="flex items-center text-sm font-medium text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-1.5" />
            Back
          </button>
        </div>
        
        <div className="mb-8 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Your Profile</h1>
        {!isEditing && (
          <button
            onClick={() => setIsEditing(true)}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Edit Profile
          </button>
        )}
      </div>

      {successMsg && (
        <div className="mb-6 p-4 rounded-lg bg-green-50 dark:bg-green-900/30 border border-green-200 dark:border-green-800 flex items-center text-green-700 dark:text-green-400">
          <Check className="w-5 h-5 mr-3" />
          {successMsg}
        </div>
      )}

      {error && (
        <div className="mb-6 p-4 rounded-lg bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-sm text-red-600 dark:text-red-400">
          {error}
        </div>
      )}

      <div className="bg-white dark:bg-gray-900 rounded-xl border border-gray-200 dark:border-gray-800 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="h-32 bg-gradient-to-r from-blue-600 to-indigo-600"></div>

        <div className="px-6 sm:px-10 pb-10">
          {/* Avatar and Name */}
          <div className="relative flex items-end -mt-16 mb-8">
            <div className="relative w-32 h-32 rounded-full border-4 border-white dark:border-gray-900 bg-gray-200 dark:bg-gray-800 overflow-hidden flex items-center justify-center">
              {formData.avatar_url || user.avatar ? (
                <img 
                  src={isEditing ? formData.avatar_url : (user.avatar || undefined)} 
                  alt={user.name || 'User'} 
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    // Fallback to initials if image fails to load
                    (e.target as HTMLImageElement).style.display = 'none';
                    e.currentTarget.parentElement?.classList.add('bg-blue-100', 'dark:bg-blue-900/30', 'text-blue-600', 'dark:text-blue-400');
                  }}
                />
              ) : (
                <span className="text-4xl font-bold text-gray-500 dark:text-gray-400">{userInitials}</span>
              )}
            </div>
            
            {!isEditing && (
              <div className="ml-6 mb-2">
                <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{user.name}</h2>
                <p className="text-gray-500 dark:text-gray-400 text-lg flex items-center mt-1">
                  <Mail className="w-4 h-4 mr-2" />
                  {user.email}
                </p>
              </div>
            )}
          </div>

          {/* Form / View Content */}
          <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* View Mode */}
            {!isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                <div className="md:col-span-2 space-y-8">
                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center mb-3">
                      <AlignLeft className="w-5 h-5 mr-2 text-gray-400" />
                      About Me
                    </h3>
                    {user.bio ? (
                      <p className="text-gray-600 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                        {user.bio}
                      </p>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 italic">No bio provided yet.</p>
                    )}
                  </div>

                  <div>
                    <h3 className="text-lg font-medium text-gray-900 dark:text-white flex items-center mb-3">
                      <Code className="w-5 h-5 mr-2 text-gray-400" />
                      Skills
                    </h3>
                    {Array.isArray(user.skills) && user.skills.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {user.skills.map((skill: string, i: number) => (
                          <span key={i} className="px-3 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 rounded-full text-sm font-medium border border-blue-100 dark:border-blue-800">
                            {skill}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-400 dark:text-gray-500 italic">No skills added yet.</p>
                    )}
                  </div>
                </div>

                <div className="space-y-6">
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                      Connect
                    </h3>
                    <div className="space-y-3">
                      {user.githubLink ? (
                        <a 
                          href={user.githubLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-gray-700 dark:text-gray-300 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                        >
                          <GithubIcon className="w-5 h-5 mr-3" />
                          GitHub Profile
                        </a>
                      ) : (
                        <div className="flex items-center text-gray-400 dark:text-gray-600">
                          <GithubIcon className="w-5 h-5 mr-3" />
                          Not connected
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Edit Mode */}
            {isEditing && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Full Name
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <User className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="John Doe"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Avatar URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Camera className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        name="avatar_url"
                        value={formData.avatar_url}
                        onChange={handleChange}
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="https://example.com/avatar.jpg"
                      />
                    </div>
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">Provide a link to an image to use as your avatar.</p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      GitHub URL
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <GithubIcon className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="url"
                        name="github_url"
                        value={formData.github_url}
                        onChange={handleChange}
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="https://github.com/username"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-5">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Bio
                    </label>
                    <textarea
                      name="bio"
                      value={formData.bio}
                      onChange={handleChange}
                      rows={4}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                      placeholder="Tell us a little bit about yourself..."
                    ></textarea>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Skills (comma separated)
                    </label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Code className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        name="skillsStr"
                        value={formData.skillsStr}
                        onChange={handleChange}
                        className="pl-10 w-full px-3 py-2 border border-gray-300 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800 text-gray-900 dark:text-white focus:ring-blue-500 focus:border-blue-500 transition-colors"
                        placeholder="React, TypeScript, Node.js"
                      />
                    </div>
                  </div>
                </div>

                <div className="md:col-span-2 pt-4 flex items-center justify-end border-t border-gray-200 dark:border-gray-800 mt-4 space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-200 border border-gray-300 dark:border-gray-700 rounded-lg font-medium transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-5 py-2.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg font-medium transition-colors flex items-center"
                  >
                    {isLoading && <LoadingSpinner size="sm" />}
                    <span className={isLoading ? 'ml-2' : ''}>Save Changes</span>
                  </button>
                </div>
              </div>
            )}

          </form>
        </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
