import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Lock, Loader2, Mail, Key,Server } from "lucide-react";
import toast from "react-hot-toast";


const schema = z.object({
  MAIL_HOST: z.string().min(3, "Hôte SMTP requis"),
  MAIL_PORT: z
    // .number({ invalid_type_error: "Port invalide" })
    .int()
    .min(1)
    .max(65535),
  MAIL_USER: z.string().min(3, "Utilisateur SMTP requis"),
  MAIL_PASS: z.string().min(1, "Mot de passe requis"),
});

type FormDTO = z.infer<typeof schema>;

export default function Settings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<FormDTO>({
    resolver: zodResolver(schema),
    defaultValues: {
      MAIL_HOST: "smtp.gmail.com",
      MAIL_PORT: 587,
      MAIL_USER: "",
      MAIL_PASS: "",
    },
  });

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        // // const res = await mailService.getEnv();
        // if (!mounted) return;
        // // Remplir le formulaire avec les valeurs du serveur (si présentes)
        // setValue("MAIL_HOST", res.MAIL_HOST ?? "smtp.gmail.com");
        // setValue("MAIL_PORT", res.MAIL_PORT ? Number(res.MAIL_PORT) : 587);
        // setValue("MAIL_USER", res.MAIL_USER ?? "");
        // setValue("MAIL_PASS", res.MAIL_PASS ?? "");
      } catch (err: any) {
        console.error(err);
        toast.error("Impossible de charger les paramètres mail");
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [setValue]);

  const onSubmit = async (data: FormDTO) => {
    setSaving(true);
    try {
    //   await mailService.updateEnv({
    //     MAIL_HOST: data.MAIL_HOST,
    //     MAIL_PORT: String(data.MAIL_PORT),
    //     MAIL_USER: data.MAIL_USER,
    //     MAIL_PASS: data.MAIL_PASS,
    //   });
      toast.success("Paramètres SMTP enregistrés avec succès");
    } catch (err: any) {
      console.error(err);
      toast.error(err?.response?.data?.message || "Erreur lors de l'enregistrement");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6">
        <Loader2 className="w-6 h-6 animate-spin mr-2 inline" /> Chargement...
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-4">

        <div>
          <h1 className="text-2xl font-bold text-gray-900">Paramètres SMTP</h1>
          <p className="text-gray-500 text-sm mt-1">
            Modifie les variables d'envoi d'email (MAIL_HOST, MAIL_PORT, MAIL_USER, MAIL_PASS)
          </p>
        </div>
      </div>

      <div className="card">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Hôte SMTP</label>
             <div className="flex items-center gap-2">
              <Server className="w-5 h-5 text-gray-400" />
              <input
                type="text"
                {...register("MAIL_HOST")}
                className="input-field flex-1"
                placeholder="smtp.gmail.com"
              />
            </div>
            {errors.MAIL_HOST && (
              <p className="text-red-500 text-sm mt-1">{errors.MAIL_HOST.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Port SMTP</label>
              <div className="flex items-center gap-2">
           <Key className="w-5 h-5 text-gray-400" />
            <input
              type="number"
              {...register("MAIL_PORT", { valueAsNumber: true })}
              className="input-field w-48"
              min={1}
              max={65535}
              placeholder="587"
            />
            </div>
            {errors.MAIL_PORT && (
              <p className="text-red-500 text-sm mt-1">{errors.MAIL_PORT.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Utilisateur SMTP</label>
              <div className="flex items-center gap-2">
              <Mail className="w-5 h-5 text-gray-400" />
            <input
              type="text"
              {...register("MAIL_USER")}
              className="input-field"
              placeholder="ex: your@gmail.com"
            />
            </div>
            {errors.MAIL_USER && (
              <p className="text-red-500 text-sm mt-1">{errors.MAIL_USER.message}</p>
            )}
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-2">Mot de passe (App password)</label>
            <div className="flex items-center gap-2">
              <Lock className="w-5 h-5 text-gray-400" />
              <input
                type="password"
                {...register("MAIL_PASS")}
                className="input-field flex-1"
                placeholder="Mot de passe d'application Google"
              />
            </div>
            {errors.MAIL_PASS && (
              <p className="text-red-500 text-sm mt-1">{errors.MAIL_PASS.message}</p>
            )}
            <p className="text-xs text-gray-500 mt-2">
              Attention : ce mot de passe sera sauvegardé côté serveur. Utilise un mot de passe d'application Google.
            </p>
          </div>

          <div className="flex gap-3 pt-4 border-t border-gray-100">
            <button type="button" onClick={() => navigate(-1)} className="btn-secondary flex-1">
              Annuler
            </button>
            <button
              type="submit"
              disabled={saving}
              className="btn-primary flex-1 flex items-center justify-center gap-2"
            >
              {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : "Enregistrer les paramètres"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}