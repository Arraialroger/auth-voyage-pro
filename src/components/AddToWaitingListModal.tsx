import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { Search, Clock } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { logger } from '@/lib/logger';

const waitingListSchema = z.object({
  patient_id: z.string().min(1, 'Paciente é obrigatório'),
  professional_id: z.string().min(1, 'Profissional é obrigatório'),
  treatment_id: z.string().optional(),
  notes: z.string().optional(),
});

type WaitingListFormData = z.infer<typeof waitingListSchema>;

interface AddToWaitingListModalProps {
  trigger: React.ReactNode;
  onSuccess?: () => void;
}

export function AddToWaitingListModal({ trigger, onSuccess }: AddToWaitingListModalProps) {
  const [open, setOpen] = useState(false);
  const [patientSearchOpen, setPatientSearchOpen] = useState(false);
  const queryClient = useQueryClient();

  // Log para debug mobile
  React.useEffect(() => {
    if (open) {
      logger.log('AddToWaitingListModal aberto', {
        isMobile: window.innerWidth < 768,
        viewport: { width: window.innerWidth, height: window.innerHeight },
        userAgent: navigator.userAgent
      });
    }
  }, [open]);

  const form = useForm<WaitingListFormData>({
    resolver: zodResolver(waitingListSchema),
    defaultValues: {
      patient_id: '',
      professional_id: '',
      notes: '',
    },
  });

  // Fetch patients
  const { data: patients = [] } = useQuery({
    queryKey: ['patients'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('patients')
        .select('id, full_name, contact_phone')
        .order('full_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        full_name: string;
        contact_phone: string;
      }>;
    },
  });

  // Fetch professionals
  const { data: professionals = [] } = useQuery({
    queryKey: ['professionals'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('professionals')
        .select('id, full_name, specialization')
        .order('full_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        full_name: string;
        specialization: string;
      }>;
    },
  });

  const { data: treatments = [] } = useQuery({
    queryKey: ['treatments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('treatments')
        .select('id, treatment_name, cost')
        .order('treatment_name');
      
      if (error) throw error;
      return data as Array<{
        id: string;
        treatment_name: string;
        cost: number | null;
      }>;
    },
  });

  const onSubmit = async (data: WaitingListFormData) => {
    try {
      // Check for duplicates
      const { data: existingEntry } = await supabase
        .from('waiting_list')
        .select('id')
        .eq('patient_id', data.patient_id)
        .eq('professional_id', data.professional_id)
        .single();

      if (existingEntry) {
        toast({
          title: 'Paciente já na lista',
          description: 'Este paciente já está na lista de espera para este profissional.',
          variant: 'destructive',
        });
        return;
      }

      const { error } = await supabase
        .from('waiting_list')
        .insert([
          {
            patient_id: data.patient_id,
            professional_id: data.professional_id,
            treatment_id: data.treatment_id || null,
            notes: data.notes || null,
          },
        ]);

      if (error) throw error;

      toast({
        title: 'Adicionado à lista de espera',
        description: 'Paciente adicionado à lista de espera com sucesso.',
      });

      queryClient.invalidateQueries({ queryKey: ['waiting-list'] });
      form.reset();
      setOpen(false);
      onSuccess?.();
    } catch (error) {
      logger.error('Erro ao adicionar à lista de espera:', error);
      toast({
        title: 'Erro',
        description: 'Erro ao adicionar à lista de espera. Tente novamente.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Adicionar à Lista de Espera
          </DialogTitle>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            {/* Patient Search Field */}
            <FormField
              control={form.control}
              name="patient_id"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Paciente</FormLabel>
                  <Popover open={patientSearchOpen} onOpenChange={setPatientSearchOpen}>
                    <PopoverTrigger asChild>
                      <FormControl>
                        <Button
                          variant="outline"
                          role="combobox"
                          className={cn(
                            "justify-between",
                            !field.value && "text-muted-foreground"
                          )}
                        >
                          {field.value
                            ? patients.find((patient) => patient.id === field.value)?.full_name
                            : "Selecione um paciente"}
                          <Search className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                        </Button>
                      </FormControl>
                    </PopoverTrigger>
                    <PopoverContent className="w-[400px] p-0">
                      <Command>
                        <CommandInput placeholder="Buscar paciente..." />
                        <CommandList>
                          <CommandEmpty>Nenhum paciente encontrado.</CommandEmpty>
                          <CommandGroup>
                            {patients.map((patient) => (
                              <CommandItem
                                key={patient.id}
                                value={patient.full_name}
                                onSelect={() => {
                                  field.onChange(patient.id);
                                  setPatientSearchOpen(false);
                                }}
                              >
                                <div className="flex flex-col">
                                  <span>{patient.full_name}</span>
                                  <span className="text-sm text-muted-foreground">
                                    {patient.contact_phone}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        </CommandList>
                      </Command>
                    </PopoverContent>
                  </Popover>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Professional Select */}
            <FormField
              control={form.control}
              name="professional_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Profissional Desejado</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um profissional" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {professionals.map((professional) => (
                        <SelectItem key={professional.id} value={professional.id}>
                          <div className="flex flex-col">
                            <span>{professional.full_name}</span>
                            <span className="text-sm text-muted-foreground">
                              {professional.specialization}
                            </span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Treatment Field */}
            <FormField
              control={form.control}
              name="treatment_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Tratamento Desejado (Opcional)</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione um tratamento" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {treatments.map((treatment) => (
                        <SelectItem key={treatment.id} value={treatment.id}>
                          {treatment.treatment_name}
                          {treatment.cost && ` - R$ ${treatment.cost.toFixed(2)}`}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Notes Field */}
            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Observações (opcional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="Adicione observações sobre a preferência do paciente..."
                      className="resize-none"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit">
                Adicionar à Lista
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}