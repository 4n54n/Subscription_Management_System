import { Badge } from '@affine/admin/components/ui/badge';
import { Button } from '@affine/admin/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@affine/admin/components/ui/dialog';
import { Input } from '@affine/admin/components/ui/input';
import { useMutation } from '@affine/admin/use-mutation';
import { notify } from '@affine/component';
import { updateAppConfigMutation } from '@affine/graphql';
import { get } from 'lodash-es';
import {
  Check,
  Edit2,
  Image as ImageIcon,
  PenTool,
  Plus,
  Trash2,
  Upload,
  UserCheck,
  Users,
  X,
} from 'lucide-react';
import React, { useCallback, useEffect, useRef, useState } from 'react';

import type { AppConfig } from '../config';

export interface AuthorizedPersonnel {
  id: string;
  name: string;
  role: string;
  signatureData?: string;
}

const DEFAULT_PERSONNELS: AuthorizedPersonnel[] = [
  {
    id: 'signatory-1',
    name: 'Ansan Mathew',
    role: 'Founder & Director',
    signatureData: '',
  },
];

export function ManageAuthorizedPersonnels({
  appConfig,
  onUpdate,
}: {
  appConfig: AppConfig;
  onUpdate?: (path: string, value: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const rawList = get(appConfig, 'server.authorizedPersonnels', null);

  const [personnels, setPersonnels] = useState<AuthorizedPersonnel[]>(() => {
    if (Array.isArray(rawList) && rawList.length > 0) {
      return rawList;
    }
    return DEFAULT_PERSONNELS;
  });

  // Keep state synchronized if appConfig updates
  useEffect(() => {
    if (Array.isArray(rawList)) {
      setPersonnels(rawList);
    }
  }, [rawList]);

  // Form states for adding / editing
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formName, setFormName] = useState('');
  const [formRole, setFormRole] = useState('');
  const [formSignature, setFormSignature] = useState('');
  const [isSavingDirectly, setIsSavingDirectly] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { trigger: triggerSaveConfig } = useMutation({
    mutation: updateAppConfigMutation,
  });

  const resetForm = useCallback(() => {
    setEditingId(null);
    setFormName('');
    setFormRole('');
    setFormSignature('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleStartEdit = useCallback((personnel: AuthorizedPersonnel) => {
    setEditingId(personnel.id);
    setFormName(personnel.name || '');
    setFormRole(personnel.role || '');
    setFormSignature(personnel.signatureData || '');
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;

      if (!file.type.startsWith('image/')) {
        notify.error({
          title: 'Invalid File',
          message: 'Please upload an image file (PNG, JPG, SVG, or WEBP).',
        });
        return;
      }

      // Check max size (approx 3MB)
      if (file.size > 3 * 1024 * 1024) {
        notify.error({
          title: 'File Too Large',
          message: 'Signature image must be under 3MB.',
        });
        return;
      }

      const reader = new FileReader();
      reader.onload = event => {
        const base64 = event.target?.result as string;
        if (base64) {
          setFormSignature(base64);
        }
      };
      reader.readAsDataURL(file);
    },
    []
  );

  const handleSavePersonnel = useCallback(() => {
    const trimmedName = formName.trim();
    const trimmedRole = formRole.trim();

    if (!trimmedName) {
      notify.error({
        title: 'Name Required',
        message: 'Please provide the personnel or signatory name.',
      });
      return;
    }

    if (!trimmedRole) {
      notify.error({
        title: 'Role Required',
        message: 'Please provide the designation or role (e.g. Founder & Director).',
      });
      return;
    }

    let nextList: AuthorizedPersonnel[];

    if (editingId) {
      nextList = personnels.map(p =>
        p.id === editingId
          ? {
              ...p,
              name: trimmedName,
              role: trimmedRole,
              signatureData: formSignature,
            }
          : p
      );
      notify.success({
        title: 'Updated',
        message: `Updated details for ${trimmedName}.`,
      });
    } else {
      const newPersonnel: AuthorizedPersonnel = {
        id: `personnel-${Date.now()}`,
        name: trimmedName,
        role: trimmedRole,
        signatureData: formSignature,
      };
      nextList = [...personnels, newPersonnel];
      notify.success({
        title: 'Added',
        message: `Added ${trimmedName} as authorized personnel.`,
      });
    }

    setPersonnels(nextList);
    onUpdate?.('server/authorizedPersonnels', nextList);
    resetForm();
  }, [editingId, formName, formRole, formSignature, personnels, onUpdate, resetForm]);

  const handleDeletePersonnel = useCallback(
    (id: string, name: string) => {
      const nextList = personnels.filter(p => p.id !== id);
      setPersonnels(nextList);
      onUpdate?.('server/authorizedPersonnels', nextList);
      if (editingId === id) {
        resetForm();
      }
      notify.success({
        title: 'Removed',
        message: `Removed ${name} from authorized personnels.`,
      });
    },
    [editingId, personnels, onUpdate, resetForm]
  );

  const handleDirectSaveAll = useCallback(async () => {
    setIsSavingDirectly(true);
    try {
      await triggerSaveConfig({
        updates: [
          {
            module: 'server',
            key: 'authorizedPersonnels',
            value: personnels as any,
          },
        ],
      });
      onUpdate?.('server/authorizedPersonnels', personnels);
      notify.success({
        title: 'Authorized Personnels Saved',
        message: 'All signatory profiles and signatures are saved to configuration.',
      });
      setIsOpen(false);
    } catch (err: any) {
      notify.error({
        title: 'Save Failed',
        message: err?.message || 'Could not save authorized personnels.',
      });
    } finally {
      setIsSavingDirectly(false);
    }
  }, [personnels, triggerSaveConfig, onUpdate]);

  return (
    <>
      {/* Settings Card Section */}
      <div className="border rounded-xl p-6 bg-card space-y-4 shadow-sm mt-1 mb-2">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 rounded-lg bg-primary/10 text-primary shrink-0">
              <UserCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-semibold text-foreground">
                  Authorized Personnels & Signatories
                </h3>
                <Badge variant="secondary" className="font-mono text-[11px]">
                  {personnels.length} {personnels.length === 1 ? 'personnel' : 'personnels'}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5 max-w-xl">
                Configure verified company signatories, executive directors, and key personnels
                whose names, official designations, and signatures appear across certificates,
                letterheads, and proposals.
              </p>
            </div>
          </div>

          <Button
            type="button"
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90"
          >
            <Users className="w-4 h-4" />
            <span>Manage Authorized Personnels</span>
          </Button>
        </div>

        {/* Quick Preview of Configured Signatories */}
        {personnels.length > 0 && (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-2">
            {personnels.map(p => (
              <div
                key={p.id}
                className="flex items-center justify-between p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors text-xs"
              >
                <div className="min-w-0 pr-2">
                  <div className="font-semibold text-foreground truncate">{p.name}</div>
                  <div className="text-muted-foreground text-[11px] truncate">{p.role}</div>
                </div>
                <div className="shrink-0">
                  {p.signatureData ? (
                    <Badge variant="outline" className="text-[10px] text-emerald-600 border-emerald-300 bg-emerald-50/50">
                      Sign Added
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      No Sign
                    </Badge>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Management Dialog Modal */}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-2xl sm:max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <UserCheck className="w-5 h-5 text-primary" />
              <span>Manage Authorized Personnels & Signatories</span>
            </DialogTitle>
            <DialogDescription className="text-xs text-muted-foreground">
              Add or edit authorized signatories for IntoAI corporate documents. Enter their legal
              name, official role/designation, and upload their signature image.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 pt-2">
            {/* Add / Edit Form Card */}
            <div className="p-4 rounded-xl border bg-muted/20 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  {editingId ? (
                    <>
                      <Edit2 className="w-4 h-4 text-primary" />
                      <span>Edit Personnel Details</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 text-primary" />
                      <span>Add New Authorized Personnel</span>
                    </>
                  )}
                </h4>
                {editingId && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={resetForm}
                    className="h-7 text-xs text-muted-foreground hover:text-foreground"
                  >
                    <X className="w-3.5 h-3.5 mr-1" />
                    Cancel Edit
                  </Button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Personnel Full Name <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formName}
                    onChange={e => setFormName(e.target.value)}
                    placeholder="e.g. Ansan Mathew"
                    className="text-sm"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Role / Official Designation <span className="text-destructive">*</span>
                  </label>
                  <Input
                    type="text"
                    value={formRole}
                    onChange={e => setFormRole(e.target.value)}
                    placeholder="e.g. Founder & Director"
                    className="text-sm"
                  />
                </div>
              </div>

              {/* Signature Image Upload Section */}
              <div>
                <label className="text-xs font-semibold text-foreground block mb-1.5">
                  Signature Image (PNG / JPG / SVG / WEBP)
                </label>

                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileChange}
                  accept="image/png,image/jpeg,image/svg+xml,image/webp"
                  className="hidden"
                />

                {formSignature ? (
                  <div className="flex flex-col sm:flex-row items-center gap-4 p-3 rounded-lg border bg-background">
                    <div className="w-44 h-16 rounded border bg-white flex items-center justify-center p-2 relative overflow-hidden shadow-inner">
                      <img
                        src={formSignature}
                        alt="Signature Preview"
                        className="max-h-full max-w-full object-contain filter contrast-125"
                      />
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => fileInputRef.current?.click()}
                        className="text-xs h-8"
                      >
                        <Upload className="w-3.5 h-3.5 mr-1.5" />
                        Change Image
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => setFormSignature('')}
                        className="text-xs h-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                      >
                        <Trash2 className="w-3.5 h-3.5 mr-1.5" />
                        Remove Signature
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    onClick={() => fileInputRef.current?.click()}
                    className="border-2 border-dashed rounded-lg p-5 text-center cursor-pointer hover:border-primary/60 hover:bg-primary/5 transition-colors flex flex-col items-center justify-center gap-2"
                  >
                    <div className="p-2 rounded-full bg-muted text-muted-foreground">
                      <PenTool className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs font-medium text-foreground">
                        Click to upload personnel signature image
                      </p>
                      <p className="text-[11px] text-muted-foreground mt-0.5">
                        Transparent PNG or SVG recommended (Max 3MB)
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end pt-1">
                <Button
                  type="button"
                  onClick={handleSavePersonnel}
                  className="flex items-center gap-1.5 text-xs h-8"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{editingId ? 'Update Personnel' : 'Add to List'}</span>
                </Button>
              </div>
            </div>

            {/* List of Configured Personnels */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  Configured Authorized Personnels ({personnels.length})
                </h4>
              </div>

              {personnels.length === 0 ? (
                <div className="text-center py-6 text-xs text-muted-foreground border rounded-lg">
                  No authorized personnels added yet. Use the form above to add one.
                </div>
              ) : (
                <div className="space-y-2.5">
                  {personnels.map((personnel, index) => (
                    <div
                      key={personnel.id}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-lg border transition-all ${
                        editingId === personnel.id
                          ? 'border-primary bg-primary/5 ring-1 ring-primary'
                          : 'bg-card hover:border-muted-foreground/30'
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs shrink-0">
                          {index + 1}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-semibold text-foreground flex items-center gap-2">
                            <span>{personnel.name}</span>
                            {index === 0 && (
                              <Badge variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                                Primary Signatory
                              </Badge>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground">{personnel.role}</div>
                        </div>
                      </div>

                      <div className="flex items-center gap-4 self-end sm:self-center shrink-0">
                        {/* Signature Status / Thumbnail */}
                        {personnel.signatureData ? (
                          <div className="w-24 h-9 rounded border bg-white flex items-center justify-center p-1 overflow-hidden shadow-xs">
                            <img
                              src={personnel.signatureData}
                              alt={`${personnel.name}'s signature`}
                              className="max-h-full max-w-full object-contain filter contrast-125"
                            />
                          </div>
                        ) : (
                          <div className="text-[11px] text-muted-foreground italic flex items-center gap-1">
                            <ImageIcon className="w-3.5 h-3.5 text-muted-foreground/60" />
                            <span>No sign</span>
                          </div>
                        )}

                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-muted-foreground hover:text-foreground"
                            onClick={() => handleStartEdit(personnel)}
                            title="Edit personnel"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            className="w-7 h-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => handleDeletePersonnel(personnel.id, personnel.name)}
                            title="Delete personnel"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="flex flex-col-reverse sm:flex-row items-center justify-between gap-3 pt-3 border-t">
              <p className="text-[11px] text-muted-foreground">
                Changes apply across all workspace documents, proposals, and certificates.
              </p>
              <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsOpen(false)}
                  className="text-xs"
                >
                  Done
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={handleDirectSaveAll}
                  disabled={isSavingDirectly}
                  className="text-xs bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isSavingDirectly ? 'Saving...' : 'Save & Apply Changes'}
                </Button>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
