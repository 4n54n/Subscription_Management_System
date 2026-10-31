import { Button } from '@affine/admin/components/ui/button';
import type { CarouselApi } from '@affine/admin/components/ui/carousel';
import {
  Carousel,
  CarouselContent,
  CarouselItem,
} from '@affine/admin/components/ui/carousel';
import { useAsyncCallback } from '@affine/core/components/hooks/affine-async-hooks';
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';

import { affineFetch } from '../../fetch-utils';
import { useServerConfig } from '../common';
import { CreateAdmin } from './create-admin';

export enum CarouselSteps {
  Welcome = 0,
  CreateAdmin,
  SettingsDone,
}

const Welcome = () => {
  return (
    <div className="flex flex-col justify-center w-full max-w-md font-sans space-y-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
        Welcome to IntoAI
      </h1>
      <p className="text-lg font-medium text-muted-foreground leading-relaxed">
        Configure your Self Host IntoAI with a few simple settings.
      </p>
    </div>
  );
};

const SettingsDone = () => {
  return (
    <div className="flex flex-col justify-center w-full max-w-md font-sans space-y-4">
      <h1 className="text-4xl font-extrabold tracking-tight text-foreground lg:text-5xl">
        All Settings Done
      </h1>
      <p className="text-lg font-medium text-muted-foreground leading-relaxed">
        IntoAI is ready to use.
      </p>
    </div>
  );
};

const CarouselItemElements = {
  [CarouselSteps.Welcome]: Welcome,
  [CarouselSteps.CreateAdmin]: CreateAdmin,
  [CarouselSteps.SettingsDone]: SettingsDone,
};

export const Form = () => {
  const [api, setApi] = useState<CarouselApi>();
  const [current, setCurrent] = useState(0);
  const [count, setCount] = useState(0);

  const navigate = useNavigate();
  const serverConfig = useServerConfig();

  const isCreateAdminStep = current - 1 === CarouselSteps.CreateAdmin;
  const disableContinue = false;

  useEffect(() => {
    if (!api) {
      return;
    }

    setCount(api.scrollSnapList().length);
    setCurrent(api.selectedScrollSnap() + 1);

    api.on('select', () => {
      setCurrent(api.selectedScrollSnap() + 1);
    });
  }, [api, serverConfig.initialized, navigate]);

  const handleMicrosoftSignIn = useCallback(async () => {
    try {
      const response = await affineFetch('/api/oauth/preflight', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          provider: 'microsoft',
          redirect_uri: window.location.origin + '/admin',
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to start Microsoft sign-in.');
      }

      const data = await response.json();
      if (data?.url) {
        window.location.href = data.url;
      }
    } catch (err) {
      toast.error((err as Error).message);
    }
  }, []);

  const onNext = useAsyncCallback(async () => {
    if (isCreateAdminStep) {
      return handleMicrosoftSignIn();
    }

    if (current === count) {
      return navigate('/', { replace: true });
    }

    api?.scrollNext();
  }, [api, count, current, isCreateAdminStep, handleMicrosoftSignIn, navigate]);

  const onPrevious = useCallback(() => {
    if (current === count) {
      if (serverConfig.initialized === true) {
        return navigate('/admin', { replace: true });
      }
      toast.error('Goto Admin Panel failed, please try again.');
      return;
    }
    api?.scrollPrev();
  }, [api, count, current, serverConfig.initialized, navigate]);

  return (
    <div className="flex flex-col justify-between h-full w-full max-w-xl mx-auto lg:mx-0">
      <div className="flex-1 flex flex-col justify-center my-auto py-4">
        <Carousel
          setApi={setApi}
          className="w-full"
          opts={{ watchDrag: false }}
        >
          <CarouselContent>
            {Object.entries(CarouselItemElements).map(([key, Element]) => (
              <CarouselItem key={key}>
                <Element onMicrosoftSignIn={handleMicrosoftSignIn} />
              </CarouselItem>
            ))}
          </CarouselContent>
        </Carousel>
      </div>

      <div className="flex flex-col gap-6 pt-4 pb-2 mt-auto">
        <div className="flex items-center gap-3">
          {current > 1 && (
            <Button onClick={onPrevious} variant="outline">
              {current === count ? 'Goto Admin Panel' : 'Back'}
            </Button>
          )}
          <Button onClick={onNext} disabled={disableContinue}>
            {current === count ? 'Open IntoAI' : 'Continue'}
          </Button>
        </div>

        <div className="flex items-center gap-1.5 py-1">
          {Array.from({ length: count }).map((_, index) => (
            <span
              key={`${index}`}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                index <= current - 1
                  ? 'w-14 bg-primary'
                  : 'w-14 bg-muted-foreground/20'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  );
};
