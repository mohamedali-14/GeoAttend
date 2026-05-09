/**
 * DoctorMaterials — Professor uploads materials (PDFs/files) for students
 * Feature from mobile: ProfessorMaterialsScreen
 */
import { useState } from "react";
import { Upload, FileText, Trash2, BookOpen, AlertTriangle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useMockData } from "../../context/MockDataContext";

interface Material {
  id: string; courseId: string; courseName: string;
  name: string; url: string; uploadedAt: string; size?: string;
}

export default function DoctorMaterials() {
  const { user } = useAuth();
  const { courses } = useMockData();
  const myCourses = courses.filter(c => c.doctorId === user?.id);

  const [materials, setMaterials]   = useState<Material[]>(() => {
    try { return JSON.parse(localStorage.getItem("geo_materials_" + user?.id) || "[]"); }
    catch { return []; }
  });
  const [selCourse, setSelCourse]   = useState(myCourses[0]?.id || "");
  const [uploading, setUploading]   = useState(false);
  const [dragOver,  setDragOver]    = useState(false);

  const save = (items: Material[]) => {
    setMaterials(items);
    localStorage.setItem("geo_materials_" + user?.id, JSON.stringify(items));
  };

  const handleFiles = (files: FileList | null) => {
    if (!files || !selCourse) return;
    setUploading(true);
    const course = myCourses.find(c => c.id === selCourse);
    const newItems: Material[] = Array.from(files).map(f => ({
      id: `mat_${Date.now()}_${Math.random().toString(36).slice(2)}`,
      courseId: selCourse,
      courseName: course?.name || "",
      name: f.name,
      url: URL.createObjectURL(f),
      uploadedAt: new Date().toISOString(),
      size: f.size > 1024*1024 ? `${(f.size/1024/1024).toFixed(1)} MB` : `${Math.round(f.size/1024)} KB`,
    }));
    setTimeout(() => {
      save([...materials, ...newItems]);
      setUploading(false);
    }, 800);
  };

  const remove = (id: string) => save(materials.filter(m => m.id !== id));

  const courseMaterials = materials.filter(m => m.courseId === selCourse);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Course Materials</h2>
        <p className="text-slate-400 text-sm mt-0.5">Upload PDFs and files for your students</p>
      </div>

      {myCourses.length === 0 ? (
        <div className="text-center py-16 bg-[#111827] border border-slate-800 rounded-xl">
          <BookOpen className="w-12 h-12 text-slate-600 mx-auto mb-3"/>
          <p className="text-slate-400">No courses assigned yet</p>
        </div>
      ) : (
        <>
          {/* Course selector */}
          <div className="bg-[#111827] border border-slate-800 rounded-xl p-5">
            <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Select Course</label>
            <select value={selCourse} onChange={e => setSelCourse(e.target.value)}
              className="w-full bg-[#1E293B] border border-slate-700 text-white px-3 py-2.5 rounded-lg text-sm focus:outline-none focus:border-blue-500">
              {myCourses.map(c => <option key={c.id} value={c.id}>{c.name} ({c.code})</option>)}
            </select>
          </div>

          {/* Upload area */}
          <div
            onDragOver={e => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={e => { e.preventDefault(); setDragOver(false); handleFiles(e.dataTransfer.files); }}
            onClick={() => document.getElementById("mat-file-input")?.click()}
            className={`border-2 border-dashed rounded-xl p-10 flex flex-col items-center gap-3 cursor-pointer transition-all ${
              dragOver ? "border-blue-500 bg-blue-500/5" : "border-slate-700 hover:border-slate-500"
            }`}>
            <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${dragOver ? "bg-blue-500/20" : "bg-slate-800"}`}>
              {uploading ? (
                <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin"/>
              ) : (
                <Upload className={`w-6 h-6 ${dragOver ? "text-blue-400" : "text-slate-400"}`}/>
              )}
            </div>
            <div className="text-center">
              <p className="text-white font-semibold">{uploading ? "Uploading..." : "Upload Materials"}</p>
              <p className="text-slate-400 text-sm mt-0.5">Drag & drop or click — PDF, Word, PPT, etc.</p>
            </div>
            <input id="mat-file-input" type="file" multiple accept=".pdf,.doc,.docx,.ppt,.pptx,.txt"
              onChange={e => handleFiles(e.target.files)} className="hidden"/>
          </div>

          {/* Materials list */}
          {courseMaterials.length === 0 ? (
            <div className="text-center py-10 text-slate-500">
              <FileText className="w-10 h-10 mx-auto mb-2 opacity-30"/>
              <p className="text-sm">No materials uploaded for this course yet</p>
            </div>
          ) : (
            <div className="bg-[#111827] border border-slate-800 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-800 flex items-center justify-between">
                <h3 className="text-white font-semibold">Uploaded Files</h3>
                <span className="text-slate-500 text-sm">{courseMaterials.length} file{courseMaterials.length !== 1 ? "s" : ""}</span>
              </div>
              <div className="divide-y divide-slate-800/50">
                {courseMaterials.map(m => (
                  <div key={m.id} className="flex items-center gap-3 px-5 py-4 hover:bg-slate-800/20 transition-colors">
                    <div className="w-10 h-10 bg-blue-500/10 border border-blue-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-blue-400"/>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-white text-sm font-medium truncate">{m.name}</p>
                      <p className="text-slate-500 text-xs">{m.size} · {new Date(m.uploadedAt).toLocaleDateString("en-EG", {month:"short",day:"numeric"})}</p>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <a href={m.url} download={m.name}
                        className="px-3 py-1.5 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 rounded-lg text-xs font-semibold transition-all">
                        Download
                      </a>
                      <button onClick={() => remove(m.id)} className="text-slate-500 hover:text-red-400 transition-colors p-1.5">
                        <Trash2 className="w-4 h-4"/>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 p-4 bg-yellow-500/5 border border-yellow-500/20 rounded-xl">
            <AlertTriangle className="w-4 h-4 text-yellow-400 flex-shrink-0"/>
            <p className="text-yellow-400/80 text-xs">Files are stored locally in the browser. Connect to backend storage (Firebase Storage) for permanent hosting.</p>
          </div>
        </>
      )}
    </div>
  );
}
