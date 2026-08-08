import { useForm } from 'react-hook-form';
import * as z from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { cn } from '@/lib/utils';
import { getApiErrorMessage } from '@/lib/api-error';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
  Field,
  FieldDescription,
  FieldGroup,
  FieldLabel,
  FieldError,
} from '@/components/ui/field';
import { Input } from '@/components/ui/input';

import { useRegister } from '@/features/auth/api/useAuth';
import type { SignUpRequestDto } from '@/api/generated/models';

const formSchema = z
  .object({
    email: z.string().email('Correo inválido'),
    password: z.string().min(8, 'Debe tener al menos 8 caracteres'),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Las contraseñas no coinciden',
    path: ['confirmPassword'],
  });

export function SignupForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const register = useRegister();

  const form = useForm<SignUpRequestDto & { confirmPassword: string }>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '', confirmPassword: '' },
  });

  const onSubmit = (data: SignUpRequestDto & { confirmPassword: string }) => {
    register.mutate(
      { data: { email: data.email, password: data.password } },
      {
        onSuccess: () => {
          toast.success('La cuenta se creó correctamente');
          navigate('/connect-ml');
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'No se pudo crear la cuenta'));
        },
      },
    );
  };

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Crear cuenta</CardTitle>
          <CardDescription>
            Ingrese su correo electrónico para crear una cuenta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={form.handleSubmit(onSubmit)}>
            <FieldGroup>
              <Field>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  {...form.register('email')}
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                />
                {form.formState.errors.email && (
                  <FieldError errors={[form.formState.errors.email]} />
                )}
              </Field>
              <Field>
                <Field className="grid grid-cols-2 gap-4">
                  <Field>
                    <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                    <Input
                      {...form.register('password')}
                      id="password"
                      type="password"
                    />
                    {form.formState.errors.password && (
                      <FieldError errors={[form.formState.errors.password]} />
                    )}
                  </Field>
                  <Field>
                    <FieldLabel htmlFor="confirm-password">
                      Confirmar
                    </FieldLabel>
                    <Input
                      {...form.register('confirmPassword')}
                      id="confirm-password"
                      type="password"
                    />
                    {form.formState.errors.confirmPassword && (
                      <FieldError
                        errors={[form.formState.errors.confirmPassword]}
                      />
                    )}
                  </Field>
                </Field>
                <FieldDescription>
                  Debe tener al menos 8 caracteres.
                </FieldDescription>
              </Field>
              <Field>
                <Button
                  type="submit"
                  disabled={register.isPending}
                  className="w-full"
                >
                  {register.isPending ? 'Creando cuenta...' : 'Crear cuenta'}
                </Button>
                <FieldDescription className="text-center">
                  ¿Ya tiene una cuenta? <Link to="/login">Inicie sesión</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
