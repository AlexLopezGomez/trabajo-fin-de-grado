'use client';

import { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { getMySpaces } from '@/app/actions/spaces/index';
import type { SpaceSummary } from '@/types/spaces';
import { logger } from "@/lib/utils/logger";

/**
 * Custom hook for managing spaces data
 * Fetches and provides access to user's spaces
 */
export function useSpaces() {
    const { data: session } = useSession();
    const [spaces, setSpaces] = useState<SpaceSummary[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        if (session?.user) {
            loadSpaces();
        }
    }, [session]);

    const loadSpaces = async () => {
        setIsLoading(true);
        try {
            const result = await getMySpaces({});
            if (result.success && result.data) {
                setSpaces(result.data.spaces);
            }
        } catch (error) {
            logger.error('Failed to load spaces', error);
        } finally {
            setIsLoading(false);
        }
    };

    return {
        spaces,
        isLoading,
        loadSpaces,
    };
}
