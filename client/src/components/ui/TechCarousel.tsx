import React from 'react';
import { Swiper } from './Swiper';
import { Block } from './Block';


interface TechItem {
    icon: string;
    text: string;
}

interface TechCardProps {
    title: string;
    items: TechItem[];
}


interface TechItem {
    icon: string;
    text: string;
    // description: string;
}

interface TechStackItem {
    title: string;
    // description: string;
    items: TechItem[];
}

interface TechCarouselProps {
    items: TechStackItem[];
}

export const TechCard: React.FC<TechCardProps> = ({ title, items }) => {
    return (

        <div className="w-full max-w-[340px] md:max-w-[360px] aspect-[3/4] p-1 rounded-lg bg-gradient-to-br from-blue-500 via-purple-500 to-pink-500 shadow-xl transition-transform duration-300 mx-auto">
        <Block title={title} titleCenter mediumTitle >

                <div className="flex flex-col gap-4 font-pixel">
                    {items.map((item, idx) => (
                        <div key={idx} className="flex w-full items-center gap-4 p-3 rounded-lg bg-[#23234a]">
                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-gradient-to-br from-[#1a1f3d] to-[#2c1f47] shadow-inner">
                                <span className="text-2xl bg-gradient-to-br from-blue-400 to-purple-400 bg-clip-text text-transparent">{item.icon}</span>
                            </div>
                            <span className="text-lg font-04b font-bold text-white">
                                {item.text}
                            </span>
                        </div>
                    ))}
                </div>
        </Block>
        </div>
    );
};




export const TechCarousel: React.FC<TechCarouselProps> = ({ items }) => {
    return (
            <Swiper items={items} />
    );
}; 