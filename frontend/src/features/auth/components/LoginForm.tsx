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

import { useLogin } from '@/features/auth/api/useAuth';
import type { LoginRequestDto } from '@/api/generated/models';

const formSchema = z.object({
  email: z.email('Correo inválido'),
  password: z.string().min(8, 'Debe tener al menos 8 caracteres'),
});

export function LoginForm({
  className,
  ...props
}: React.ComponentProps<'div'>) {
  const navigate = useNavigate();
  const login = useLogin();

  const onSubmit = (data: LoginRequestDto) => {
    login.mutate(
      { data },
      {
        onSuccess: () => {
          toast.success('Sesión iniciada');
          // No consultamos el estado de ML acá: MlRequiredRoute se lo pregunta al
          // servidor y redirige a /connect-ml si hace falta.
          navigate('/dashboard');
        },
        onError: (error) => {
          toast.error(getApiErrorMessage(error, 'Credenciales inválidas'));
        },
      },
    );
  };

  const form = useForm<LoginRequestDto>({
    resolver: zodResolver(formSchema),
    defaultValues: { email: '', password: '' },
  });

  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader className="text-center">
          <CardTitle className="text-xl">Iniciar sesión</CardTitle>
          <CardDescription>
            Ingrese su correo electrónico para acceder a su cuenta
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
                <Button
                  type="submit"
                  disabled={login.isPending}
                  className="w-full"
                >
                  {login.isPending ? 'Iniciando sesión...' : 'Iniciar sesión'}
                </Button>
                <FieldDescription className="text-center">
                  ¿No tiene una cuenta? <Link to="/signup">Regístrese</Link>
                </FieldDescription>
              </Field>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
