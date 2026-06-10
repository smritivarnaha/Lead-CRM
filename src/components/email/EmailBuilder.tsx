"use client";

import { useState } from "react";
import { ArrowLeft, Save, Type, Image as ImageIcon, Minus, Link as LinkIcon, ShieldAlert, Trash2, GripVertical, Bold, Italic, Link2 } from "lucide-react";
import { toast } from "sonner";

const SPAM_WORDS = ["free", "buy now", "act now", "guarantee", "risk free", "no catch", "click here", "subscribe", "earn", "make money"];

export function EmailBuilder({ initialData, onClose, onSave }: { initialData?: any, onClose: () => void, onSave: (data: any) => void }) {
  const [name, setName] = useState(initialData?.name || "");
  const [subject, setSubject] = useState(initialData?.subject || "");
  
  const [blocks, setBlocks] = useState<any[]>(
    initialData?.designJson ? JSON.parse(initialData.designJson) : [{ id: "1", type: "text", content: "Hello {{name}},<br/><br/>Thanks for contacting us!" }]
  );

  const [saving, setSaving] = useState(false);

  // Drag and drop state
  const [draggedItem, setDraggedItem] = useState<{ source: "sidebar" | "canvas", type?: string, index?: number } | null>(null);
  const [dropTargetIndex, setDropTargetIndex] = useState<number | null>(null);

  const addBlock = (type: string, index: number = blocks.length) => {
    const newBlock = { id: Date.now().toString(), type, content: type === "text" ? "New text block" : type === "button" ? "Click Me" : "" };
    const newBlocks = [...blocks];
    newBlocks.splice(index, 0, newBlock);
    setBlocks(newBlocks);
  };

  const updateBlock = (id: string, updates: any) => {
    setBlocks(blocks.map(b => b.id === id ? { ...b, ...updates } : b));
  };

  const removeBlock = (id: string) => {
    setBlocks(blocks.filter(b => b.id !== id));
  };

  const moveBlock = (fromIndex: number, toIndex: number) => {
    const newBlocks = [...blocks];
    const [moved] = newBlocks.splice(fromIndex, 1);
    newBlocks.splice(toIndex, 0, moved);
    setBlocks(newBlocks);
  };

  const handleDragStart = (e: React.DragEvent, source: "sidebar" | "canvas", type?: string, index?: number) => {
    setDraggedItem({ source, type, index });
    e.dataTransfer.effectAllowed = "move";
    // Required for Firefox
    e.dataTransfer.setData("text/plain", "dummy");
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dropTargetIndex !== index) {
      setDropTargetIndex(index);
    }
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    if (!draggedItem) return;

    if (draggedItem.source === "sidebar" && draggedItem.type) {
      addBlock(draggedItem.type, targetIndex);
    } else if (draggedItem.source === "canvas" && draggedItem.index !== undefined) {
      // Adjust target index if we are moving downwards
      let finalTarget = targetIndex;
      if (draggedItem.index < targetIndex) {
        finalTarget = targetIndex - 1; // Since the item is removed from before
      }
      if (draggedItem.index !== finalTarget) {
        moveBlock(draggedItem.index, finalTarget);
      }
    }
    
    setDraggedItem(null);
    setDropTargetIndex(null);
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDropTargetIndex(null);
  };

  const checkSpam = () => {
    const fullText = (subject + " " + blocks.map(b => b.content).join(" ")).toLowerCase();
    const found = SPAM_WORDS.filter(w => fullText.includes(w));
    return found;
  };

  const generateHtml = () => {
    return blocks.map(b => {
      if (b.type === "text") return `<div style="font-family:sans-serif;color:#333;line-height:1.6;font-size:14px;">${b.content}</div>`;
      if (b.type === "image") return `<img src="${b.url || 'https://via.placeholder.com/600x200'}" style="max-width:100%;border-radius:8px;margin:20px 0;display:block;" />`;
      if (b.type === "button") return `<div style="text-align:center;margin:30px 0;"><a href="${b.url || '#'}" style="background-color:#4F46E5;color:white;padding:12px 24px;border-radius:6px;text-decoration:none;font-weight:bold;display:inline-block;font-family:sans-serif;">${b.content}</a></div>`;
      if (b.type === "divider") return `<hr style="border:0;border-top:1px solid #E5E7EB;margin:30px 0;" />`;
      return "";
    }).join("\n");
  };

  const handleSave = () => {
    if (!name || !subject) {
      toast.error("Name and Subject are required.");
      return;
    }
    setSaving(true);
    const bodyHtml = generateHtml();
    onSave({
      id: initialData?.id,
      name,
      subject,
      bodyHtml,
      designJson: JSON.stringify(blocks)
    });
  };

  // Rich Text Handlers
  const execCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
  };

  const spamWords = checkSpam();

  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex-1 flex flex-col h-full absolute inset-0 z-20">
      <div className="flex items-center justify-between p-4 border-b border-slate-100 bg-slate-50">
        <div className="flex items-center gap-4">
          <button onClick={onClose} className="p-2 hover:bg-slate-200 rounded-lg text-slate-600 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              placeholder="Template Name (e.g. Welcome Email)" 
              className="font-bold text-lg text-slate-900 bg-transparent border-none outline-none focus:ring-0 placeholder-slate-400 w-64"
            />
          </div>
        </div>
        <button 
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2 rounded-lg font-semibold text-sm transition-colors disabled:opacity-50"
        >
          <Save className="w-4 h-4" /> {saving ? "Saving..." : "Save Template"}
        </button>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar - Blocks */}
        <div className="w-64 border-r border-slate-200 bg-slate-50 p-4 flex flex-col gap-4 overflow-y-auto">
          <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">Content Blocks</h3>
          <div className="grid grid-cols-2 gap-2">
            {[
              { type: 'text', icon: Type, label: 'Text' },
              { type: 'image', icon: ImageIcon, label: 'Image' },
              { type: 'button', icon: LinkIcon, label: 'Button' },
              { type: 'divider', icon: Minus, label: 'Divider' }
            ].map(block => (
              <div 
                key={block.type}
                draggable
                onDragStart={(e) => handleDragStart(e, "sidebar", block.type)}
                onDragEnd={handleDragEnd}
                onClick={() => addBlock(block.type)}
                className="flex flex-col items-center gap-2 bg-white border border-slate-200 p-3 rounded-xl hover:border-indigo-400 hover:text-indigo-600 transition-colors shadow-sm cursor-grab active:cursor-grabbing"
              >
                <block.icon className="w-5 h-5" />
                <span className="text-xs font-semibold">{block.label}</span>
              </div>
            ))}
          </div>

          <div className="mt-6">
            <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Variables</h3>
            <p className="text-[11px] text-slate-500 leading-snug mb-3">Click to copy and paste into your text.</p>
            <div className="flex flex-wrap gap-2">
              {['{{name}}', '{{email}}', '{{source}}', '{{company}}'].map(v => (
                <button 
                  key={v}
                  onClick={() => { navigator.clipboard.writeText(v); toast.success(`Copied ${v}`); }}
                  className="bg-indigo-50 border border-indigo-100 text-indigo-700 px-2 py-1 rounded text-[11px] font-mono hover:bg-indigo-100 transition-colors"
                >
                  {v}
                </button>
              ))}
            </div>
          </div>

          {spamWords.length > 0 && (
            <div className="mt-auto bg-amber-50 border border-amber-200 p-3 rounded-xl flex flex-col gap-2">
              <div className="flex items-center gap-2 text-amber-700 font-semibold text-xs">
                <ShieldAlert className="w-4 h-4" /> Deliverability Warning
              </div>
              <p className="text-[10px] text-amber-600 leading-tight">
                Found potential spam trigger words: <strong>{spamWords.join(", ")}</strong>. Consider removing them to improve inbox placement.
              </p>
            </div>
          )}
        </div>

        {/* Canvas */}
        <div 
          className="flex-1 bg-slate-100 overflow-y-auto p-8 flex justify-center"
          onDragOver={(e) => e.preventDefault()}
        >
          <div className="bg-white w-full max-w-2xl min-h-[600px] shadow-sm rounded-lg border border-slate-200 p-8 flex flex-col gap-2 pb-32">
            <div className="border-b border-slate-100 pb-4 mb-4">
              <label className="text-xs font-bold text-slate-400 uppercase">Subject Line</label>
              <input 
                value={subject}
                onChange={e => setSubject(e.target.value)}
                placeholder="Enter subject here..."
                className="w-full text-xl font-bold text-slate-800 outline-none mt-1 border-b border-transparent focus:border-indigo-300 pb-1"
              />
            </div>

            <div className="flex flex-col relative">
              {blocks.length === 0 && (
                <div 
                  onDragOver={(e) => handleDragOver(e, 0)}
                  onDrop={(e) => handleDrop(e, 0)}
                  className="text-center py-20 text-slate-400 border-2 border-dashed border-slate-200 rounded-xl"
                >
                  Drag blocks from the sidebar to build your email.
                </div>
              )}
              
              {blocks.map((b, idx) => (
                <div key={b.id} className="relative">
                  {/* Drop zone above block */}
                  <div 
                    onDragOver={(e) => handleDragOver(e, idx)}
                    onDrop={(e) => handleDrop(e, idx)}
                    className={`h-4 w-full transition-colors rounded-full ${dropTargetIndex === idx ? "bg-indigo-200 my-1 h-6" : ""}`}
                  />
                  
                  <div 
                    draggable
                    onDragStart={(e) => handleDragStart(e, "canvas", b.type, idx)}
                    onDragEnd={handleDragEnd}
                    className="group relative border border-transparent hover:border-slate-200 hover:bg-slate-50 p-4 rounded-xl transition-all cursor-move"
                  >
                    <div className="absolute top-1/2 -left-3 -translate-y-1/2 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing text-slate-400 p-1">
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <button onClick={() => removeBlock(b.id)} className="absolute top-2 right-2 p-1.5 bg-white border border-slate-200 rounded-md text-red-500 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm hover:bg-red-50 z-10">
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>

                    {b.type === "text" && (
                      <div className="flex flex-col gap-2">
                        {/* Mini Rich Text Toolbar */}
                        <div className="flex items-center gap-1 p-1 bg-white border border-slate-200 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 left-0 shadow-sm z-10">
                          <button onClick={(e) => { e.preventDefault(); execCommand('bold'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Bold">
                            <Bold className="w-3.5 h-3.5" />
                          </button>
                          <button onClick={(e) => { e.preventDefault(); execCommand('italic'); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Italic">
                            <Italic className="w-3.5 h-3.5" />
                          </button>
                          <div className="w-px h-4 bg-slate-200 mx-1"></div>
                          <button onClick={(e) => { e.preventDefault(); const url = prompt("Enter URL:"); if (url) execCommand('createLink', url); }} className="p-1.5 hover:bg-slate-100 rounded text-slate-700" title="Add Link">
                            <Link2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div 
                          contentEditable
                          suppressContentEditableWarning
                          onBlur={e => updateBlock(b.id, { content: e.currentTarget.innerHTML })}
                          className="w-full bg-transparent outline-none min-h-[50px] text-sm text-slate-700 leading-relaxed font-sans"
                          dangerouslySetInnerHTML={{ __html: b.content }}
                        />
                      </div>
                    )}
                    {b.type === "image" && (
                      <div className="flex flex-col gap-2">
                        <div className="bg-slate-100 h-40 rounded-lg flex flex-col items-center justify-center border border-slate-200 relative overflow-hidden pointer-events-none">
                          {b.url ? <img src={b.url} alt="block" className="w-full h-full object-cover" /> : <ImageIcon className="w-8 h-8 text-slate-300" />}
                        </div>
                        <input 
                          value={b.url || ""}
                          onChange={e => updateBlock(b.id, { url: e.target.value })}
                          onClick={e => e.stopPropagation()} // allow clicking to type
                          onMouseDown={e => e.stopPropagation()}
                          placeholder="Image URL (https://...)"
                          className="text-xs border border-slate-200 rounded px-2 py-1.5 w-full outline-none focus:border-indigo-400"
                        />
                      </div>
                    )}
                    {b.type === "button" && (
                      <div className="flex flex-col items-center gap-3 py-4 pointer-events-none">
                        <button className="bg-indigo-600 text-white px-6 py-3 rounded-lg font-bold">{b.content}</button>
                        <div className="flex gap-2 w-full max-w-xs opacity-0 group-hover:opacity-100 transition-opacity mt-2 pointer-events-auto">
                          <input 
                            value={b.content}
                            onChange={e => updateBlock(b.id, { content: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="Button Label"
                            className="text-xs border border-slate-200 rounded px-2 py-1.5 flex-1 outline-none focus:border-indigo-400"
                          />
                          <input 
                            value={b.url || ""}
                            onChange={e => updateBlock(b.id, { url: e.target.value })}
                            onClick={e => e.stopPropagation()}
                            onMouseDown={e => e.stopPropagation()}
                            placeholder="Link URL"
                            className="text-xs border border-slate-200 rounded px-2 py-1.5 flex-1 outline-none focus:border-indigo-400"
                          />
                        </div>
                      </div>
                    )}
                    {b.type === "divider" && (
                      <div className="py-4">
                        <hr className="border-0 border-t border-slate-200" />
                      </div>
                    )}
                  </div>
                </div>
              ))}
              
              {/* Drop zone below last block */}
              {blocks.length > 0 && (
                <div 
                  onDragOver={(e) => handleDragOver(e, blocks.length)}
                  onDrop={(e) => handleDrop(e, blocks.length)}
                  className={`h-4 w-full transition-colors rounded-full ${dropTargetIndex === blocks.length ? "bg-indigo-200 my-1 h-6" : ""}`}
                />
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
