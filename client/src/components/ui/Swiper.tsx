import 'swiper/css';
import { Autoplay } from 'swiper/modules';
import { Swiper as SwiperReact, SwiperSlide } from 'swiper/react';
import { TechCard } from './TechCarousel';

interface TechItem {
    icon: string;
    text: string;
}

interface TechStackItem {
    title: string;
    items: TechItem[];
}

interface SwiperProps {
    items: TechStackItem[];
}

export const Swiper: React.FC<SwiperProps> = ({ items }) => {
    return (
        <div className="flex justify-center items-center w-full min-h-[300px] md:min-h-[500px] px-2">
            <SwiperReact
                spaceBetween={24}
                slidesPerView={1}
                breakpoints={{
                    640: { slidesPerView: 1 },
                    768: { slidesPerView: 2 },
                    1024: { slidesPerView: 3 },
                }}
                autoplay={{
                    delay: 2500,
                    disableOnInteraction: false,
                }}
                loop={true}
                modules={[Autoplay]}
                className="w-full max-w-[1100px]"
            >
                {items.map((item, index) => (
                    <SwiperSlide key={index} className="flex items-center justify-center h-auto">
                        <TechCard
                            title={item.title}
                            items={item.items}
                        />
                    </SwiperSlide>
                ))}
            </SwiperReact>
        </div>
    );
};